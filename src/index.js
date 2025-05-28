require('dotenv').config();
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Store active WhatsApp instances
const instances = new Map();

// Function to create a new WhatsApp instance
function createWhatsAppInstance(instanceId, phoneNumber) {
    const instancePath = path.join(__dirname, '../.wwebjs_auth', instanceId);

    // Create directory if it doesn't exist
    if (!fs.existsSync(instancePath)) {
        fs.mkdirSync(instancePath, { recursive: true });
    }

    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: instanceId,
            dataPath: instancePath
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    });

    // WhatsApp client events
    client.on('qr', (qr) => {
        console.log(`QR Code received for instance ${instanceId}:`);
        qrcode.generate(qr, { small: true });
        // Store QR code for frontend
        instances.get(instanceId).qr = qr;
    });

    client.on('ready', () => {
        console.log(`WhatsApp client ${instanceId} is ready!`);
        instances.get(instanceId).status = 'ready';
        instances.get(instanceId).qr = null;
    });

    client.on('authenticated', () => {
        console.log(`WhatsApp client ${instanceId} is authenticated!`);
        instances.get(instanceId).status = 'authenticated';
    });

    client.on('auth_failure', (msg) => {
        console.error(`Authentication failure for instance ${instanceId}:`, msg);
        instances.get(instanceId).status = 'auth_failure';
    });

    client.on('disconnected', (reason) => {
        console.log(`Client ${instanceId} was disconnected:`, reason);
        instances.get(instanceId).status = 'disconnected';
    });

    // Initialize WhatsApp client
    client.initialize().catch(err => {
        console.error(`Failed to initialize WhatsApp client ${instanceId}:`, err);
        instances.get(instanceId).status = 'error';
    });

    return client;
}

// API Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/instances', (req, res) => {
    const instancesList = Array.from(instances.entries()).map(([id, instance]) => ({
        instanceId: id,
        status: instance.status,
        qr: instance.qr,
        phoneNumber: instance.phoneNumber,
        createdAt: instance.createdAt
    }));

    res.json({
        status: 'success',
        instances: instancesList
    });
});

app.post('/instances', (req, res) => {
    try {
        const { instanceId, phoneNumber } = req.body;

        if (!instanceId || !phoneNumber) {
            return res.status(400).json({
                status: 'error',
                message: 'Instance ID and phone number are required'
            });
        }

        if (instances.has(instanceId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Instance already exists'
            });
        }

        const client = createWhatsAppInstance(instanceId, phoneNumber);

        instances.set(instanceId, {
            client,
            status: 'initializing',
            qr: null,
            phoneNumber,
            createdAt: new Date()
        });

        res.json({
            status: 'success',
            message: 'Instance created successfully',
            instanceId
        });
    } catch (error) {
        console.error('Error creating instance:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create instance',
            error: error.message
        });
    }
});

app.get('/instances/:instanceId/status', (req, res) => {
    const { instanceId } = req.params;

    if (!instances.has(instanceId)) {
        return res.status(404).json({
            status: 'error',
            message: 'Instance not found'
        });
    }

    const instance = instances.get(instanceId);
    res.json({
        status: 'success',
        data: {
            instanceId,
            status: instance.status,
            qr: instance.qr,
            phoneNumber: instance.phoneNumber,
            createdAt: instance.createdAt
        }
    });
});

app.post('/instances/:instanceId/send-message', async (req, res) => {
    try {
        const { instanceId } = req.params;
        const { number, message } = req.body;

        if (!instances.has(instanceId)) {
            return res.status(404).json({
                status: 'error',
                message: 'Instance not found'
            });
        }

        const instance = instances.get(instanceId);

        if (instance.status !== 'ready') {
            return res.status(400).json({
                status: 'error',
                message: 'Instance is not ready'
            });
        }

        if (!number || !message) {
            return res.status(400).json({
                status: 'error',
                message: 'Number and message are required'
            });
        }

        // Validate number format
        const cleanNumber = number.replace(/[^0-9]/g, '');
        if (cleanNumber.length < 10) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid phone number format'
            });
        }

        // Format number to include country code if not present
        const formattedNumber = cleanNumber.includes('@c.us') ? cleanNumber : `${cleanNumber}@c.us`;

        const response = await instance.client.sendMessage(formattedNumber, message);

        res.json({
            status: 'success',
            message: 'Message sent successfully',
            data: {
                id: response.id._serialized,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to send message',
            error: error.message
        });
    }
});

app.delete('/instances/:instanceId', (req, res) => {
    const { instanceId } = req.params;

    if (!instances.has(instanceId)) {
        return res.status(404).json({
            status: 'error',
            message: 'Instance not found'
        });
    }

    const instance = instances.get(instanceId);
    instance.client.destroy();
    instances.delete(instanceId);

    res.json({
        status: 'success',
        message: 'Instance deleted successfully'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
    });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
}); 