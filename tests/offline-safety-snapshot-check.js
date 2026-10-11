const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
for(const needle of ['WLQ_OFFLINE_SAFETY_KEY','readOfflineSafetySnapshot','writeOfflineSafetySnapshot','offline-safety']){if(!app.includes(needle))throw new Error('missing '+needle)}
if(!app.includes("navigator.onLine===false&&!snapshotHasData(accountSnapshot)&&snapshotHasData(offlineSafety)"))throw new Error('offline recovery branch missing');
console.log('offline safety snapshot check: PASS');
