- store data in redis database about...
 1. amount of shares owned by each miner eth account
2. the current 'share difficulty '


- Using JSONRPC, allow miners to ask what my 'share difficulty is (2)'
- using JSONRPC, accept mining solutions from miners of the share difficulty and grant them shares for each one ! You get more shares for better solutiosn
- We will check the solutions as they come in.. obviously
- Every ten seconds ask the smart contract what its difficulty is  
- If a solution we have has a difficulty greater than required by the smart contract, we will submit it to the smart contract for a reward !
- Every so often we will pay out tokens to the miners based on shares#






## Requires    Redis connection to 127.0.0.1:6379
  1. sudo apt-get install redis



## TODO

Need to add websockets (see space app) which will pull data (ultimately) from redis !! 
