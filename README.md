# 📋 Clipboard Manager

Monitor e gerencie o histórico da sua área de transferência via interface web.

## 🚀 Como usar

```bash
# Instalar dependências
npm install

# Iniciar o servidor
npm start
```

Acesse: **http://localhost:8080**

## 📌 Funcionalidades

- Monitoramento automático do clipboard (a cada 500ms)
- Interface web em tempo real com auto-refresh
- Histórico de até 100 itens
- Detecção automática de tipo (Texto, Número, Long Text)
- Design responsivo e moderno

## 🛠️ Tecnologias

- Node.js
- Express.js
- PowerShell (para acesso ao clipboard)

## 📁 Estrutura

```
.
├── index.js        # Servidor principal
├── package.json    # Dependências
└── README.md       # Este arquivo
```

## ⚠️ Notas

- Requer Windows (usa PowerShell para acessar clipboard)
- O antivírus pode bloquear execuções de .exe (use `npm start` para rodar diretamente)