# Dexcandles V2

Candle-sticks data subgraph for trading on Joe-V2 (5m/15m/1h/4h/1d/1w). 

The subgraph indexes all trades for a given `tokenX-tokenY` pair, across both Joe-V1 and Joe-V2 DEX. 


## Install

```
# install graph-cli
$ yarn global add @graphprotocol/graph-cli

# build 
$ yarn 
$ yarn prepare:avax
$ yarn codegen:avax
$ yarn build:avax

# authenticate
$ graph auth --product hosted-service

# deploy to avax. change to your own graph endpoint
$ yarn deploy:avax
```