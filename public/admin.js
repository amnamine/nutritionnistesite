// Fonction pour charger et afficher les utilisateurs
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Erreur lors du chargement des utilisateurs');
        const users = await response.json();
        const userList = document.getElementById('user-list');
        if (!userList) return;
        userList.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.role}</td>
                <td><span class="user-status status-${user.status === 'active' ? 'active' : 'inactive'}">${user.status || 'active'}</span></td>
                <td class="user-actions">
                    <!-- Actions à compléter plus tard -->
                </td>
            `;
            userList.appendChild(tr);
        });
    } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
    }
}

// Fonction pour charger et afficher les statistiques
async function loadStatistics() {
    try {
        const response = await fetch('/api/statistics');
        if (!response.ok) throw new Error('Erreur lors du chargement des statistiques');
        const stats = await response.json();
        console.log('STATS DEBUG:', stats);
        // Mettre à jour les compteurs
        document.getElementById('stat-total-users').textContent = stats.totalUsers || 0;
        // Initialiser à 0
        let admins = 0, dieticians = 0, receptions = 0;
        if (Array.isArray(stats.usersByRole)) {
            stats.usersByRole.forEach(roleObj => {
                if (roleObj.role === 'admin') admins = roleObj.count;
                if (roleObj.role === 'dieteticien') dieticians = roleObj.count;
                if (roleObj.role === 'reception') receptions = roleObj.count;
            });
        }
        document.getElementById('stat-admins').textContent = admins;
        document.getElementById('stat-dieticians').textContent = dieticians;
        document.getElementById('stat-receptions').textContent = receptions;
        // Nouveaux utilisateurs sur 7j (optionnel, nécessite une requête SQL côté serveur)
        document.getElementById('stat-new-users').textContent = stats.newUsers7d || 0;
    } catch (error) {
        console.error('Erreur chargement statistiques:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/me');
        if (response.ok) {
            const user = await response.json();
            if (user.role === 'admin') {
                const userRoleElement = document.getElementById('user-role');
                const adminContentElement = document.getElementById('admin-content');
                
                if (userRoleElement) {
                    userRoleElement.textContent = `Connecté en tant que ${user.role}`;
                }
                if (adminContentElement) {
                    adminContentElement.innerHTML = `<p>Bienvenue, ${user.username} !</p>`;
                }
                // Charger la liste des utilisateurs
                loadUsers();
                // Charger les statistiques
                loadStatistics();
            } else {
                window.location.href = '/';
            }
        } else {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        window.location.href = '/login.html';
    }
});

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Error during logout:', error);
        }
    });
}

// Gestion du formulaire d'ajout d'utilisateur
const addUserForm = document.getElementById('add-user-form');
if (addUserForm) {
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('new-username').value;
        const password = document.getElementById('new-password').value;
        const role = document.getElementById('new-role').value;
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role })
            });
            if (response.ok) {
                addUserForm.reset();
                loadUsers();
                if (window.showNotification) window.showNotification('Utilisateur ajouté avec succès', 'success');
            } else {
                const error = await response.json();
                if (window.showNotification) window.showNotification(error.error || 'Erreur lors de l\'ajout', 'error');
            }
        } catch (error) {
            if (window.showNotification) window.showNotification('Erreur lors de l\'ajout', 'error');
            console.error('Erreur ajout utilisateur:', error);
        }
    });
} 