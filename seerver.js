const express = require('express');
const { createClient } = require('redis');

const app = express();
app.use(express.json());

// Create Redis client
const redisClient = createClient();

// Handle Redis errors
redisClient.on('error', (err) => console.error('Redis error:', err));

// Ensure Redis is connected before handling requests
(async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis');
    } catch (err) {
        console.error('Error connecting to Redis:', err);
    }
})();

const CACHE_EXPIRY = 60; // Cache expires in 60 seconds

// Middleware for caching GET single data requests
async function cacheMiddleware(req, res, next) {
    const { id } = req.params;

    try {
        const data = await redisClient.get(id);
        if (data) {
            console.log('Cache hit');
            return res.json(JSON.parse(data));
        } else {
            console.log('Cache miss');
            next();
        }
    } catch (error) {
        console.error('Redis Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

// GET Single Item Route
app.get('/data/:id', cacheMiddleware, async (req, res) => {
    const { id } = req.params;

    const data = { id, value: `Value for ${id}` };

    // Store in Redis with expiry
    await redisClient.setEx(id, CACHE_EXPIRY, JSON.stringify(data));

    res.json(data);
});

// 🔹 GET ALL DATA FROM CACHE
app.get('/data', async (req, res) => {
    try {
        const keys = await redisClient.keys('*'); // Get all keys
        if (keys.length === 0) return res.json({ message: 'No data found in cache' });

        const data = {};
        for (const key of keys) {
            const value = await redisClient.get(key);
            data[key] = JSON.parse(value);
        }

        res.json(data);
    } catch (error) {
        console.error('Error retrieving all data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST route (invalidate cache and update data)
app.post('/data', async (req, res) => {
    const { id, value } = req.body;

    if (!id || !value) {
        return res.status(400).json({ error: 'ID and value are required' });
    }

    // Ensure `id` is a valid string
    const key = String(id);

    try {
        // Invalidate the cache (delete key)
        const deleted = await redisClient.del(key);

        if (deleted === 0) {
            console.warn(`Cache key "${key}" not found`);
        } else {
            console.log(`Cache key "${key}" deleted`);
        }

        // Simulate saving to database
        const newData = { id: key, value };

        res.json({ message: 'Data updated', newData });
    } catch (error) {
        console.error('Redis Delete Error:', error);
        res.status(500).json({ error: 'Failed to update data' });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
