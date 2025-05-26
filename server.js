const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: './'
    }),
    secret: 'votre_secret_tres_securise',
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false, // Mettre à true en production avec HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 heures
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Database setup
const db = new sqlite3.Database('database.db', (err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err);
    } else {
        console.log('Connecté à la base de données SQLite.');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Erreur lors de la création de la table users:', err);
            } else {
                // Insert default users if they don't exist
                const defaultUsers = [
                    { username: 'admin', password: 'admin123', role: 'admin' },
                    { username: 'reception', password: 'reception123', role: 'reception' },
                    { username: 'dieteticien', password: 'diet123', role: 'dieteticien' }
                ];

                defaultUsers.forEach(user => {
                    bcrypt.hash(user.password, 10, (err, hash) => {
                        if (err) {
                            console.error('Erreur lors du hachage du mot de passe:', err);
                            return;
                        }
                        // First try to delete existing user
                        db.run('DELETE FROM users WHERE username = ?', [user.username], (err) => {
                            if (err) {
                                console.error('Erreur lors de la suppression de l\'utilisateur:', err);
                            }
                            // Then insert the new user
                            db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                                [user.username, hash, user.role],
                                (err) => {
                                    if (err) {
                                        console.error('Erreur lors de l\'insertion de l\'utilisateur:', err);
                                    }
                                });
                        });
                    });
                });
            }
        });

        // Patients table
        db.run(`CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            archived BOOLEAN DEFAULT 0
        )`);

        // Appointments table
        db.run(`CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            dietician_id INTEGER,
            date DATETIME NOT NULL,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY (patient_id) REFERENCES patients(id),
            FOREIGN KEY (dietician_id) REFERENCES users(id)
        )`);

        // Consultations table
        db.run(`CREATE TABLE IF NOT EXISTS consultations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            dietician_id INTEGER,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            weight REAL,
            height REAL,
            imc REAL,
            notes TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients(id),
            FOREIGN KEY (dietician_id) REFERENCES users(id)
        )`);
    });
}

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Non authentifié' });
    }
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (req.session.user && roles.includes(req.session.user.role)) {
            next();
        } else {
            res.status(403).json({ error: 'Accès non autorisé' });
        }
    };
};

// Auth routes
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Erreur de base de données' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });
        }

        try {
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });
            }

            req.session.user = {
                id: user.id,
                username: user.username,
                role: user.role
            };

            res.json({
                id: user.id,
                username: user.username,
                role: user.role
            });
        } catch (error) {
            console.error('Password comparison error:', error);
            res.status(500).json({ error: 'Erreur lors de la vérification du mot de passe' });
        }
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
        }
        res.json({ message: 'Déconnexion réussie' });
    });
});

app.get('/api/me', (req, res) => {
    if (req.session && req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ error: 'Non authentifié' });
    }
});

// Admin routes
app.get('/api/users', requireAuth, requireRole(['admin', 'reception', 'dieteticien']), (req, res) => {
    // Si admin, retourne tous les users
    if (req.session.user.role === 'admin') {
        db.all('SELECT id, username, role, status, created_at FROM users', (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        });
    } else {
        // Sinon, retourne uniquement les diététiciens
        db.all('SELECT id, username, role, status, created_at FROM users WHERE role = "dieteticien"', (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        });
    }
});

app.post('/api/users', requireAuth, requireRole(['admin']), async (req, res) => {
    const { username, password, role } = req.body;
    
    try {
        const hash = await bcrypt.hash(password, 10);
        db.run(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hash, role],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ id: this.lastID });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    const { username, password, role, status } = req.body;
    const userId = req.params.id;

    try {
        if (password) {
            const hash = await bcrypt.hash(password, 10);
            db.run(
                'UPDATE users SET username = ?, password = ?, role = ?, status = ? WHERE id = ?',
                [username, hash, role, status, userId]
            );
        } else {
            db.run(
                'UPDATE users SET username = ?, role = ?, status = ? WHERE id = ?',
                [username, role, status, userId]
            );
        }
        res.json({ message: 'Utilisateur mis à jour avec succès' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Patient routes with archive functionality
app.get('/api/patients', requireAuth, (req, res) => {
    const search = req.query.search || '';
    const includeArchived = req.query.includeArchived === 'true';
    
    let query = 'SELECT * FROM patients WHERE (first_name LIKE ? OR last_name LIKE ?)';
    if (!includeArchived) {
        query += ' AND (archived = 0 OR archived IS NULL)';
    }
    
    db.all(query, [`%${search}%`, `%${search}%`], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/patients', requireAuth, (req, res) => {
    const { first_name, last_name, phone, email, address } = req.body;
    db.run(
        'INSERT INTO patients (first_name, last_name, phone, email, address) VALUES (?, ?, ?, ?, ?)',
        [first_name, last_name, phone, email, address],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/patients/:id', requireAuth, (req, res) => {
    const { first_name, last_name, phone, email, address, status } = req.body;
    db.run(
        'UPDATE patients SET first_name = ?, last_name = ?, phone = ?, email = ?, address = ?, status = ? WHERE id = ?',
        [first_name, last_name, phone, email, address, status, req.params.id],
        (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Patient mis à jour avec succès' });
        }
    );
});

// Appointment routes with dietician availability
app.get('/api/appointments', requireAuth, (req, res) => {
    const date = req.query.date;
    const dieticianId = req.query.dieticianId;

    // New query: LEFT JOIN patients and users, so we always get all appointments
    let query = `SELECT a.*, 
        COALESCE(p.first_name, '') as first_name, 
        COALESCE(p.last_name, '') as last_name, 
        COALESCE(u.username, '') as dietician_name
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.dietician_id = u.id`;
    const params = [];
    let where = [];
    if (date) {
        where.push('a.date = ?');
        params.push(date);
    }
    if (dieticianId) {
        where.push('a.dietician_id = ?');
        params.push(dieticianId);
    }
    if (where.length) {
        query += ' WHERE ' + where.join(' AND ');
    }
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/appointments', requireAuth, (req, res) => {
    const { patient_id, dietician_id, date, time } = req.body;
    db.run(
        'INSERT INTO appointments (patient_id, dietician_id, date, time) VALUES (?, ?, ?, ?)',
        [patient_id, dietician_id, date, time],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID });
        }
    );
});

// Consultation routes
app.post('/api/consultations', requireAuth, requireRole(['dieteticien']), (req, res) => {
    const { patient_id, pa_plus, pb_plus, imc, compte_rendu } = req.body;
    const dietician_id = req.session.user.id;
    
    db.run(
        'INSERT INTO consultations (patient_id, dietician_id, pa_plus, pb_plus, imc, compte_rendu) VALUES (?, ?, ?, ?, ?, ?)',
        [patient_id, dietician_id, pa_plus, pb_plus, imc, compte_rendu],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID });
        }
    );
});

app.get('/api/consultations/:patientId', requireAuth, (req, res) => {
    const patientId = req.params.patientId;
    
    db.all(
        'SELECT c.*, u.username as dietician_name FROM consultations c JOIN users u ON c.dietician_id = u.id WHERE c.patient_id = ? ORDER BY c.created_at DESC',
        [patientId],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// Statistics routes
app.get('/api/statistics', requireAuth, requireRole(['admin']), (req, res) => {
    const stats = {};
    // Get user statistics
    db.get('SELECT COUNT(*) as total FROM users', (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        stats.totalUsers = row.total;
        // Get role-based user counts
        db.all('SELECT role, COUNT(*) as count FROM users GROUP BY role', (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            stats.usersByRole = rows;
            // Get new users in last 7 days
            db.get('SELECT COUNT(*) as count FROM users WHERE created_at >= datetime("now", "-7 days")', (err, row) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                stats.newUsers7d = (row && row.count) || 0;
                // Get patient statistics
                db.get('SELECT COUNT(*) as total FROM patients', (err, row) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    stats.totalPatients = row.total;
                    // Get patient status counts
                    db.all('SELECT status, COUNT(*) as count FROM patients GROUP BY status', (err, rows) => {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        stats.patientsByStatus = rows;
                        // Get appointment statistics
                        db.get('SELECT COUNT(*) as total FROM appointments', (err, row) => {
                            if (err) {
                                res.status(500).json({ error: err.message });
                                return;
                            }
                            stats.totalAppointments = row.total;
                            res.json(stats);
                        });
                    });
                });
            });
        });
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
}); 