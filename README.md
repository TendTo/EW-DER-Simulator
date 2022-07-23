# EW DER Simulator

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

## Flow

![flow](./docs/flow.jpg)

### Todo

- [ ] Interazione con la blockchain Volta
- [ ] Aggiungere funzionalità di flessibilità
- [ ] Aggiungere possibilità di imprevisti
- [ ] Rimanere in attesa di Log di flessibilità
- [ ] Aggiungere la possibilità di visualizzare i Log
- [ ] Aggiungere scala temporale
- [ ] Aggiungere misura aggregata
- [ ] Aggiungere label del singolo DER

## 📚 Reference

- [What is a Blockchain Node Provider? Why Do I Need One?](https://www.alchemy.com/blog/what-is-a-node-provider)
- [Hierarchical key generation](https://alexey-shepelev.medium.com/hierarchical-key-generation-fc27560f786)
