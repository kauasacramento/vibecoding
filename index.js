const express = require('express');
const { exec } = require('child_process');

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
        .search-box { max-width: 800px; margin: 0 auto 20px; display: flex; gap: 10px; }
        .search-box input { flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #333; background: #16213e; color: #fff; font-size: 14px; }
        .search-box input:focus { outline: none; border-color: #00d9ff; }
        .search-box button { padding: 12px 24px; border-radius: 8px; border: none; background: #00d9ff; color: #000; font-weight: bold; cursor: pointer; }
        .search-box button:hover { background: #00b8d9; }
        .stats { text-align: center; margin-bottom: 20px; color: #888; }
        .container { max-width: 800px; margin: 0 auto; }
        .item { background: #16213e; border-radius: 8px; padding: 15px; margin-bottom: 10px; border-left: 4px solid #00d9ff; cursor: pointer; transition: transform 0.1s; }
        .item:hover { transform: scale(1.01); }
        .item.favorited { border-left-color: #ffd700; }
        .item .meta { font-size: 12px; color: #888; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
        .item .type { display: inline-block; background: #00d9ff; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
        .item .fav-btn { background: none; border: none; cursor: pointer; font-size: 18px; }
        .item .fav-btn.active { color: #ffd700; }
        .item .content { white-space: pre-wrap; word-break: break-all; font-family: monospace; background: #0f0f23; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto; }
        .item .copy-msg { color: #00ff88; font-size: 12px; margin-top: 8px; display: none; }
        .item .copy-msg.show { display: block; }
        .empty { text-align: center; color: #666; padding: 40px; }
        .refresh-btn { position: fixed; bottom: 20px; right: 20px; background: #00d9ff; color: #000; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: bold; }
        .refresh-btn:hover { background: #00b8d9; }
        .filter-btns { display: flex; gap: 10px; margin-bottom: 20px; justify-content: center; }
        .filter-btns button { padding: 8px 16px; border-radius: 20px; border: 1px solid #333; background: #16213e; color: #888; cursor: pointer; }
        .filter-btns button.active { background: #00d9ff; color: #000; border-color: #00d9ff; }
    </style>
</head>
<body>
    <h1>📋 Clipboard Manager</h1>
    <div class="search-box">
        <input type="text" id="search" placeholder="Buscar no histórico..." oninput="filterItems()">
        <button onclick="clearSearch()">Limpar</button>
    </div>
    <div class="filter-btns">
        <button class="active" onclick="setFilter('all')" id="btn-all">Todos</button>
        <button onclick="setFilter('favorites')" id="btn-favorites">⭐ Favoritos</button>
    </div>
    <div class="stats">Total de itens: <span id="count">0</span> | Última atualização: <span id="lastUpdate">-</span></div>
    <div class="container">
        <div id="items"></div>
    </div>
    <button class="refresh-btn" onclick="loadItems()">🔄 Atualizar</button>
    <script>
        let currentFilter = 'all';
        let searchTerm = '';
        
        function setFilter(filter) {
            currentFilter = filter;
            document.querySelectorAll('.filter-btns button').forEach(b => b.classList.remove('active'));
            document.getElementById('btn-' + filter).classList.add('active');
            loadItems();
        }
        
        function clearSearch() {
            document.getElementById('search').value = '';
            searchTerm = '';
            loadItems();
        }
        
        function filterItems() {
            searchTerm = document.getElementById('search').value.toLowerCase();
            loadItems();
        }
        
        function loadItems() {
            fetch('/api/items')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('count').innerText = data.length;
                    document.getElementById('lastUpdate').innerText = new Date().toLocaleTimeString();
                    const container = document.getElementById('items');
                    
                    let filtered = data;
                    if (currentFilter === 'favorites') {
                        filtered = data.filter(i => i.favorited);
                    }
                    if (searchTerm) {
                        filtered = filtered.filter(i => i.content.toLowerCase().includes(searchTerm));
                    }
                    
                    if (filtered.length === 0) {
                        container.innerHTML = '<div class="empty">Nenhum item encontrado...</div>';
                        return;
                    }
                    container.innerHTML = filtered.map(item => 
                        '<div class="item ' + (item.favorited ? 'favorited' : '') + '" onclick="copyToClipboard(' + item.id + ', this)">' +
                        '<div class="meta">' + new Date(item.timestamp).toLocaleString() + 
                        '<span>' +
                        '<span class="type">' + item.type + '</span>' +
                        '<button class="fav-btn ' + (item.favorited ? 'active' : '') + '" onclick="toggleFavorite(event, ' + item.id + ')">' + (item.favorited ? '★' : '☆') + '</button>' +
                        '</span></div>' +
                        '<div class="content">' + item.content.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
                        '<div class="copy-msg">✓ Copiado para o clipboard!</div>' +
                        '</div>'
                    ).join('');
                });
        }
        
        function toggleFavorite(e, id) {
            e.stopPropagation();
            fetch('/api/favorite/' + id, { method: 'POST' })
                .then(() => loadItems());
        }
        
        function copyToClipboard(id, el) {
            fetch('/api/items')
                .then(r => r.json())
                .then(data => {
                    const item = data.find(i => i.id === id);
                    if (item) {
                        navigator.clipboard.writeText(item.content).then(() => {
                            el.querySelector('.copy-msg').classList.add('show');
                            setTimeout(() => el.querySelector('.copy-msg').classList.remove('show'), 2000);
                        });
                    }
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
            if (err) reject(err);
            else resolve(stdout.trim());
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
                    type: detectType(content),
                    favorited: false
                });
                if (items.length > 100) items = items.slice(0, 100);
                console.log(`[+] Novo item: ${content.substring(0, 30)}...`);
            }
        } catch (err) {}
        await new Promise(r => setTimeout(r, 500));
    }
}

app.get('/', (req, res) => res.send(htmlPage));
app.get('/api/items', (req, res) => res.json(items));
app.post('/api/favorite/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const item = items.find(i => i.id === id);
    if (item) item.favorited = !item.favorited;
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`🎯 Clipboard Manager iniciado!`);
    console.log(`   Acesse: http://localhost:${PORT}`);
    monitorClipboard();
});