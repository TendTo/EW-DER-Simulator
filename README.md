# EW DER Simulator

[![Electron app release](https://github.com/TendTo/EW-DER-Simulator/actions/workflows/electron.yml/badge.svg)](https://github.com/TendTo/EW-DER-Simulator/actions/workflows/electron.yml)
[![Contract tests](https://github.com/TendTo/EW-DER-Simulator/actions/workflows/contract-tests.yml/badge.svg)](https://github.com/TendTo/EW-DER-Simulator/actions/workflows/contract-tests.yml)
[![codecov](https://codecov.io/gh/TendTo/EW-DER-Simulator/branch/master/graph/badge.svg?token=QBCXSTET23)](https://codecov.io/gh/TendTo/EW-DER-Simulator)

Simulate the interaction of DERs with the Energy Web testnet (Volta)

## 🖥 Installation

### 🧾 Requirements

- [git](https://git-scm.com/)
- [NodeJs 16.x](https://nodejs.org/)
- [npm](https://www.npmjs.com/)

### ⌨️ Steps

```bash
# Clone the repository
git clone https://github.com/TendTo/EW-DER-Simulator.git
# Move in the root directory of the project
cd EW-DER-Simulator
# Install all the project's dependencies
npm install
# Compile all the smart contracts and generate the typings
npm run compile
# Deploy the smart contract on the Volta blockchain
npm run deploy:volta
# Start the electron application
npm start
```

## 🧪 Test

```bash
npm test
```

## Flow

![flow](./docs/flow.jpg)

### Todo

- [x] Interazione con la blockchain Volta
- [x] Registrazione di un agreement all'avvio
- [x] Differenziare il numero di DER per tipologia
- [ ] Aggiungere funzionalità di flessibilità
- [x] Aggiungere possibilità di imprevisti
- [ ] Rimanere in attesa di Log di flessibilità
- [x] Aggiungere la visualizzazione dei Log degli agreement
- [x] Aggiungere scala temporale
- [x] Aggiungere misura aggregata
- [ ] Aggiungere label del singolo DER
- [x] Aggiungere i pulsanti di chiusura della finestra
- [ ] Verificare il fallimento di registrazioni degli agreement
- [x] Aggiungere un sistema di notifiche frontend
- [ ] Possibilità di modificare il numero di DER durante la simulazione
- [ ] Aggiungere counter per DER attualmente attivi (che hanno completato la transazione di agreement)
- [x] Aggiungere baseline energia aggregatore
- [x] Riportare solo l'ora nel grafico 
- [x] Aumentare la finestra di grafico (magari tramite aggregazione di dati)
- [x] Grafico fissato attorno alla baseline

## ⛏ Tools

- [NodeJs 16.x](https://nodejs.org/)
- [electron](https://www.electronjs.org/)
- [hardhat](https://hardhat.org/)
- [Nethermind](https://nethermind.io/)
- [etherjs](https://docs.ethers.io/v5/single-page/)

## 📚 Reference

- [Run local RPC node](https://energy-web-foundation.gitbook.io/energy-web/how-tos-and-tutorials/running-a-local-node)
- [What is a Blockchain Node Provider? Why Do I Need One?](https://www.alchemy.com/blog/what-is-a-node-provider)
- [Hierarchical key generation](https://alexey-shepelev.medium.com/hierarchical-key-generation-fc27560f786)
