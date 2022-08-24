# Solutions

## IOT blockchain node

### IOTA

> Source: [publication](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8963029/)

IOTA is a blockchain which focuses on IoT devices. Instead of a single linked list, like other blockchains, the structure uses an acyclic graph.

![IOTA blockchain structure](https://www.ncbi.nlm.nih.gov/core/lw/2.0/html/tileshop_pmc/tileshop_pmc_inline.html?title=Click%20on%20image%20to%20zoom&p=PMC3&id=8963029_sensors-22-01411-g003.jpg)

Every transaction links and validates a previous one, giving it weight and credibility.
In the end, a special trusted node, the Validator, creates a snapshot, validating and finalizing a transaction and every transaction reachable from it.
The chosen block is called **milestone**.

To avoid DDoS attacks and general misbehavior, each transaction needs to pass a small PoW test, which gives it credibility.

IOTA supports the acknowledgment of branches of the blockchain that were produced offline. Once they are available, they can be validated and made final like any other transaction.

### Architectures Ethereum nodes on based IoT devices

> Source: [publication](https://www.researchgate.net/figure/a-Stand-alone-IoT-node-and-b-remote-geth-client-architectures_fig1_324513648)

There are mainly three different approaches to enable an IoT device to participate to the blockchain and issue transactions.

#### Stand-alone IoT node

All the components needed to run an Ethereum node are contained in the IoT device. This means the device itself is self-sufficient.

| Pros                         | Cons                                                                        |
| ---------------------------- | --------------------------------------------------------------------------- |
| No need for any other device | Temporary loss of connectivity requires a new synchronization               |
| More secure                  | Synchronization times are extremely long                                    |
| More control                 | High ROM demand (hundreds of GBs for full nodes, about a GB for light node) |
| Less delay                   | Difficult to implement on less powerful IoT devices                         |
|                              | Some events may be lost due to to incomplete data information               |

#### Remote geth client

The IoT device communicates with a Full (or light) Ethereum node via JSON-RPC API, with HTTP or WS as the transport channel. All the work needed to manage the node is delegated to a specialized host, while the IoT device simply receives the information it needs.

The cryptographic keys needed to manage the account on the blockchain could be placed on the node. This means that shared nodes must be trusted by all users.
Alternatively, they could be located within the IoT device. The transactions are signed internally and then sent to the node, that, in turns, makes the other nodes aware of their existence.

| Pros                                                             | Cons                                     |
| ---------------------------------------------------------------- | ---------------------------------------- |
| The IoT device can be extremely simple                           | Needs at least 2 devices to work         |
| The node can be a specialized device, with high reliability      | The node must be trusted                 |
| No need to duplicate blockchain data across multiple IoT devices | Small delay due to network communication |
| Could be outsourced                                              |
