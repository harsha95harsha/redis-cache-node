const db = require('../config/db');
const redisClient = require('../config/redis');

// GET all users (Cache Enabled)
const getUsers = async (req, res) => {
    try {
        const cachedUsers = await redisClient.get('users');
        if (cachedUsers) {
            console.log('Cache Hit');
            return res.json(JSON.parse(cachedUsers));
        }

        console.log('Cache Miss');
        const [users] = await db.query('SELECT * FROM users');
        await redisClient.setEx('users', 300, JSON.stringify(users)); // Cache for 5 min
        res.status(200).json({success: true, data: users});
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET a single user (Cache Enabled)
const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const cachedUser = await redisClient.get(`user:${userId}`);
        if (cachedUser) {
            console.log('Cache Hit');
            return res.json(JSON.parse(cachedUser));
        }

        console.log('Cache Miss');
        const [user] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (user.length === 0) return res.status(404).json({ error: 'User not found' });

        await redisClient.setEx(`user:${userId}`, 300, JSON.stringify(user[0])); // Cache for 5 min
        res.status(200).json({success: true, data: user[0]});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE new user & invalidate cache
const createUser = async (req, res) => {
    try {
        const { name, email } = req.body;
        const [result] = await db.query('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);

        await redisClient.del('users'); // Invalidate cache
        res.status(201).json({ id: result.insertId, name, email });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE user & invalidate cache
const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { name, email } = req.body;

        const [result] = await db.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, userId]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });

        await redisClient.del('users'); // Invalidate cache
        await redisClient.del(`user:${userId}`);
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE user & invalidate cache
const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const [result] = await db.query('DELETE FROM users WHERE id = ?', [userId]);

        if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });

        await redisClient.del('users'); // Invalidate cache
        await redisClient.del(`user:${userId}`);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser };
