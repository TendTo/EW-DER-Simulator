# Appunti EW

## Prosumer

Il *Prosumer* è l'appellativo riservato all'utente che usufruisce della rete elettrica. Può svolgere il ruolo di produttore o consumatore.
Ogni *Prosumer* fa capo ad un *Aggregatore*, con il quale stipula un contratto che stabilisce la produzione (o consumo) attesa e la flessibilità che il *Prosumer* si impegna a garantire. Nel caso di eventualità che impediscano al *Prosumer* di adempiere ai propri obblighi contrattuali o per sua scelta arbitraria, il *Prosumer* ha la possibilità di ri-negoziare il contratto.

Il tipo di fonte energetica usata dal produttore è registrato ed utilizzato per poter stimare il pattern di fornitura di energia, che, specie per alcune fonti rinnovabili, può essere anche molto variabile.

> Distribuzione di Poisson
>
> Includere le batteria nello schema del consumatore
>
> Distinguere i Prosumer con la loro fonte (eolico, solare, batteria)
>
> Distinguere la flessibilità (produzione o riduzione), con tariffe diverse

```mermaid
flowchart LR
style p stroke-width:4px,stroke:#f96
style co stroke-width:4px,stroke:#db3035
style pr stroke-width:4px,stroke:#7ecc49
p[/Prosumer\]
pr[/Produttore\]
co[/Consumatore\]

p1[Per semplicità, c'è un rapporto 1:1 fra DER e Prosumer]
p2[Fa capo ad un Aggregatore<br>con cui stipula un contratto]
p3[Possiede un light node]

p21[È in grado di offrire una<br>flessibilità concordata nel contratto]
p22[Può ri-negoziare il contratto al ribasso<br>per non incorrere in sanzioni]

p211[Quanta flessibilità]
p212[Per quanto tempo]

pr1[Produce energia]
pr2[Può fornire flessibilità in termini di aumentare<br>temporaneamente la produzione]
pr3[È caratterizzato dalla fonte]
pr4[Ha un pattern di produzione<br>più o meno predicibile]
pr5[La capacità produttiva può variare parecchio<br>da produttore a produttore]

pr31[Eolico]
pr32[Solare]

co1[Consuma energia]
co2[Può fornire flessibilità in termini di riduzione <br> temporaneamea il consumo]

p --> pr
p --> co

p ---> p1
p ---> p2
p ---> p3

p2 --> p21
p2 --> p22

p21 --> p211
p21 --> p212

pr --> pr1
pr --> pr2
pr --> pr3
pr --> pr4
pr --> pr5

pr3 --> pr31
pr3 --> pr32

co --> co1
co --> co2
```

## Aggregatore

L'*Aggregatore* rappresenta il punto di riferimento diretto dei *Prosumer*. Il suo compito è quello di aggregare le letture provenienti dai dispositivi che hanno firmato un contratto con esso. Può così avere una visione d'insieme in tempo reale dello stato della rete elettrica sotto il suo controllo.

È possibile utilizzare le informazioni ottenute per profilare i *Prosumer*, ad esempio effettuare delle previsioni sulla fornitura in base alla fonte utilizzata per la produzione di energia.

La contabilità è gestita da uno smart contract che assegna token ai *Prosumer* secondo il contratto stipulato. Sono proprio questi token che possono poi essere riscattati per ricevere il compenso adeguato.

> p213[Ritardo massimo fra notifica ed erogazione] -> dalla richiesta del grid operator
>
> Le richieste di aggregazione avvengono una alla volta

```mermaid
flowchart LR
style a stroke-width:4px,stroke:#884dff
a[/Aggregatore\]

a1[Aggrega e gestisce più Prosumer]
a2[La contabilità è gestita da uno smart contract<br>con token simil ERC20]
a3[Tempo per le operazioni di flessibilità: 15 min. Prima e dopo]
a4[Possiede un full node]

a11[Riceve le letture dei DER tramite<br>reteinternet tradizionale]
a12[Profila i Prosumer]

a111[Le letture vengono memorizzate<br>in maniera centralizzata]
a112[Sono consultabili tramite API standard]
a113[La frequenza della raccolta dei dati<br>è nell'ordine dei secondi]

a121[Ottemperamento contratti]
a122[Partecipazione flessibilità]
a123[Andamento energia prodotta/consumata]

a --> a1
a --> a2
a --> a3
a --> a4

a1 --> a11
a1 --> a12

a11 --> a111
a11 --> a112
a11 --> a113

a12 --> a121
a12 --> a122
a12 --> a123
```



## Richiesta di flessibilità

### Modello equo

Nel momento in cui il *Grid Operator* effettua la richiesta, l'*Aggregatore* emette un evento. A tutti i *Prosumer* viene richiesto di contribuire in proporzione alla flessibilità richiesta.

> I prosumer registrano su uno smart contract l'avvenuta accettazione della richiesta.
>
> Poi viene registrata l'avvenuta erogazione, specificando se questa ha soddisfatto i requisiti o meno con un margine di errore del 10%, e occupandosi di remunerare i Prosumer, segnalando tempistiche data, ora, flessibilità fornita

```mermaid
stateDiagram-v2 
state if <<choice>>
1: Viene richiesta flessibiiltà dal grid operator (+ Mw per T tempo)
2: L'Aggregator emette un evento che coninvolge tutti i Prosumer
3a: Il Prosumer accetta la richiesta
3b: Il Prosumer non vuole o non è in grado di soddisfare la richiesta
4a: Viene invocato l'apposito metodo dello smart contract
5a: Le flessibilità fornita dal Prosumer viene ripagata
	[*] --> 1
    1 --> 2
    2 --> if
    if --> 3a
    if --> 3b
    3a --> 4a
    4a --> 5a
    5a --> [*]
```

### Modello con reputazione

Ogni *Prosumer* ha un **punteggio di reputazione** che dipende da

- ottemperamento ai termini contrattuali **(+)**
- la sua partecipazione a richieste di flessibilità precedenti **(+)**
- revisioni al ribasso dei termini contrattuali **(-)**
- cattiva condotta nella fornitura di energia (penali) **(-)**

L'aggregatore procede in maniera sequenziale coinvolgendo i prosumer in or dine di **reputazione**. A parità di reputazione, si ordinano per flessibilità garantita.
Per permettere a tutti la possibilità di partecipare, si considera anche il costo dell'energia.

> Test con parametri artificiali ?

```mermaid
stateDiagram-v2 
state if_accept <<choice>>
state if_reputation <<choice>>
1: Viene richiesta flessibilità dal grid operator (+ Mw per T tempo)
2: L'Aggregator emette un evento che coinvolge tutti i Prosumer<br>Tuttavia viene data priorità a quelli con una reputazione migliore
3a: Il prosumer si candida per il soddisfacimento della richiesta
3b: Il Prosumer non vuole o non è in grado di soddisfare la richiesta
4a: Attesa del termine temporale della richiesta
5aa: Il Prosumer ha suffciente reputazione
5ab: Il Prosumer viene scalzato da altri con reputazione superiore
6aa: Viene invocato l'apposito metodo dello smart contract
7aa: Le flessibilità fornita dal Prosumer viene ripagata
	[*] --> 1
    1 --> 2
    2 --> if_accept
    if_accept --> 3a
    if_accept --> 3b
    3a --> 4a
    4a --> if_reputation
    if_reputation --> 5aa
    if_reputation --> 5ab
    5aa --> 6aa
    6aa --> 7aa
    7aa --> [*]
```

## Simulazione

Viene simulata una richiesta di flessibilità.

1. Si simulano un numero $n$ di *Prosumer*. 
   - Devono essere dotati di un account sulla Blockchain Volta
   - Devono avere a disposizione dei Volta token per poter invocare le funzioni degli smart contract
   - Devono avere una distribuzione verosimile, sia in quanto a fonte che a produzione
2. Il numero di *Prosumer* varia (aumenta) con il tempo, per mettere sotto stress il sistema
3. L'*Aggregatore* riceve le letture dai *Prosumer*
4. L'*Aggregatore* riceve le richieste di flessibilità dal *Grid Operator* e le inoltra ai *Prosumer*

```mermaid
flowchart LR
style p1 stroke-width:4px,stroke:#f96
style p2 stroke-width:4px,stroke:#f97
style p3 stroke-width:4px,stroke:#f98
style pn stroke-width:4px,stroke:#f99
style a stroke-width:4px,stroke:#884dff

e{{Energy Web Chain}}
p1[/Prosumer 1\]
p2[/Prosumer 2\]
p3[/Prosumer 3\]
pn[/Prosumer ...\]
a[/Aggregatore\]
o[/Grid Operator\]


subgraph sp [Prosumer]
    p1
    p2
    p3
    pn
end
subgraph sa [Aggregator]
	a
end
subgraph so [Grid Aggregator]
	o
end
subgraph sb [Blockchain]
	e
end

p1 <--> a
p2 <--> a
p3 <--> a
pn <--> a

a <--> o

e <--> sa
e <--> sp
```


### Distinguere i dati 
per frequenza
per sorgente
per imprevisto

## Eventi blockchain
- aggiunta DER 
- rimozione DER (contratto con scadenza!)
- rinegoziazione del contratto (e aggiornamento scadenza!)
- richiesta di flessibilità

## Interfaccia grafica parametrizzabile ??
Aggiungi DER
Rimuovi DER
Imprevisto DER

1. Startup aggregatore
2. Startup der (delay n ms) (partiamo da 10)
3. Si registrano sul contratto (parametri contratto)
4. L'aggregatore ottiene le informazioni sui contratti dalla blockchain
5. (Casuale) richiesta di flessibilità
    6. Strategia fair, (SEMPLIFICAZIONE: la modulazione sia sempre entro il 25% e tutti siano in grado di fornirla)
    7. Strategia reputazione
8. Leggendo dalla blockchain l'aggregatore conosce il risultato aggregato della flessibilità
9. (Casuale) rinegoziazione contratto
