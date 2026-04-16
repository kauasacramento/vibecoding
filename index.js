const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8080;

let items = [];
let nextId = 1;

const htmlPage = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Clipboard Manager</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
        h1 { text-align: center; margin-bottom: 20px; color: #00d9ff; }
        .stats { text-align: center; margin-bottom: 20px; color: #888; }
        .container { max-width: 800px; margin: 0 auto; }
        .item { background: #16213e; border-radius: 8px; padding: 15px; margin-bottom: 10px; border-left: 4px solid #00d9ff; }
        .item .meta { font-size: 12px; color: #888; margin-bottom: 8px; }
        .item .content { white-space: pre-wrap; word-break: break-all; font-family: monospace; background: #0f0f23; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto; }
        .item .type { display: inline-block; background: #00d9ff; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 10px; }
        .empty { text-align: center; color: #666; padding: 40px; }
        .refresh-btn { position: fixed; bottom: 20px; right: 20px; background: #00d9ff; color: #000; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: bold; }
        .refresh-btn:hover { background: #00b8d9; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📋 Clipboard Manager</h1>
        <div class="stats">Total de itens: <span id="count">0</span> | Última atualização: <span id="lastUpdate">-</span></div>
        <div id="items"></div>
    </div>
    <button class="refresh-btn" onclick="loadItems()">🔄 Atualizar</button>
    <script>
        function loadItems() {
            fetch('/api/items')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('count').innerText = data.length;
                    document.getElementById('lastUpdate').innerText = new Date().toLocaleTimeString();
                    const container = document.getElementById('items');
                    if (data.length === 0) {
                        container.innerHTML = '<div class="empty">Nenhum item no clipboard ainda...</div>';
                        return;
                    }
                    container.innerHTML = data.map(item => 
                        '<div class="item">' +
                        '<div class="meta">' + new Date(item.timestamp).toLocaleString() + 
                        '<span class="type">' + item.type + '</span></div>' +
                        '<div class="content">' + item.content.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
                        '</div>'
                    ).join('');
                });
        }
        loadItems();
        setInterval(loadItems, 2000);
    </script>
</body>
</html>`;

function getClipboard() {
    return new Promise((resolve, reject) => {
        const ps = `Get-Clipboard -Format Text`;
        exec(`powershell -Command "${ps}"`, { encoding: 'utf8' }, (err, stdout) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

function detectType(content) {
    if (content.length > 1000) return "Long Text";
    if (content.length > 0 && content.length < 50 && /^\d+$/.test(content)) return "Number";
    return "Text";
}

async function monitorClipboard() {
    let lastContent = '';
    
    while (true) {
        try {
            const content = await getClipboard();
            
            if (content && content !== lastContent) {
                lastContent = content;
                
                items.unshift({
                    id: nextId++,
                    content: content,
                    timestamp: new Date().toISOString(),
                    type: detectType(content)
                });
                
                if (items.length > 100) {
                    items = items.slice(0, 100);
                }
                
                console.log(`[+] Novo item capturado: ${content.substring(0, 30)}...`);
            }
        } catch (err) {
            // Silently handle errors
        }
        
        await new Promise(r => setTimeout(r, 500));
    }
}

app.get('/', (req, res) => {
    res.send(htmlPage);
});

app.get('/api/items', (req, res) => {
    res.json(items);
});

app.listen(PORT, () => {
    console.log(`🎯 Clipboard Manager iniciado!`);
    console.log(`   Acesse: http://localhost:${PORT}`);
    console.log(`   Para sair: Ctrl+C`);
    
    monitorClipboard();
});