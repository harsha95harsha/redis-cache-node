const Redis = require("ioredis");

const redis = new Redis({
  host: "clustercfg.stvh-redis-db.w7kvxn.use1.cache.amazonaws.com",
  port: 6379,
  tls: {
    rejectUnauthorized: false // Allow self-signed AWS certs
  }
});

redis.ping()
  .then(res => console.log("Redis Connected:", res))
  .catch(err => console.error("Redis Connection Error:", err));