// DOM Elements
const loginPage = document.getElementById('login-page');
const mainInterface = document.getElementById('main-interface');
const userRole = document.getElementById('user-role');
const logoutBtn = document.getElementById('logout-btn');
const calendar = document.getElementById('calendar');
const timeSlots = document.getElementById('time-slots');
const consultationForm = document.getElementById('consultation-form');

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/me', {
            credentials: 'include' // Important: include credentials in the request
        });
        console.log('API /api/me response:', response);
        if (response.ok) {
            const user = await response.json();
            console.log('Current user:', user); // Debug log
            alert('DEBUG USER: ' + JSON.stringify(user));
            if (user.role && user.role.trim().toLowerCase() === 'dieteticien') {
                showMainInterface(user);
            } else {
                alert('Rôle utilisateur non autorisé : ' + user.role);
                window.location.href = '/login.html';
            }
        } else {
            alert('Non authentifié (status ' + response.status + ')');
            window.location.href = '/login.html';
        }
    } catch (error) {
        alert('Erreur JS : ' + error);
        window.location.href = '/login.html';
    }
});

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/logout', { 
                method: 'POST',
                credentials: 'include' // Important: include credentials in the request
            });
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Error during logout:', error);
        }
    });
}

function showMainInterface(user) {
    if (userRole) {
        userRole.textContent = `Connecté en tant que ${user.role}`;
    }
    if (calendar) {
        initializeCalendar();
    }
    loadTodayAppointments();
    loadStatistics();
}

// Initialize Calendar
function initializeCalendar() {
    $(calendar).fullCalendar({
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'month,agendaWeek,agendaDay'
        },
        selectable: true,
        select: function(start, end) {
            showTimeSlots(start.format('YYYY-MM-DD'));
        },
        eventRender: function(event, element) {
            if (event.status === 'cancelled') {
                element.css('background-color', '#e74c3c');
            }
        }
    });
}

// Patient Management
async function searchPatient() {
    const searchTerm = document.getElementById('patient-search').value;
    try {
        const response = await fetch(`/api/patients?search=${searchTerm}`);
        const patients = await response.json();
        displayPatients(patients);
    } catch (error) {
        console.error('Error searching patients:', error);
        showNotification('Erreur lors de la recherche des patients', 'error');
    }
}

function displayPatients(patients) {
    const resultsDiv = document.getElementById('search-results');
    resultsDiv.classList.add('patient-list-vertical');
    if (!patients || patients.length === 0) {
        resultsDiv.innerHTML = '<div style="text-align:center;color:#888;font-size:1.1rem;padding:20px;">Aucun patient trouvé.</div>';
        return;
    }
    resultsDiv.innerHTML = patients.map(patient => `
        <div class="patient-card">
            <h3>${patient.first_name} ${patient.last_name}</h3>
            <p><i class="fas fa-phone"></i> ${patient.phone || 'Non renseigné'}</p>
            <p><i class="fas fa-envelope"></i> ${patient.email || 'Non renseigné'}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${patient.address || 'Non renseignée'}</p>
            <div class="action-buttons">
                <button class="edit-btn" onclick="openEditModal(${patient.id})">
                    <i class="fas fa-edit"></i> Modifier
                </button>
                <button class="archive-btn" onclick="archivePatient(${patient.id})">
                    <i class="fas fa-archive"></i> Archiver
                </button>
            </div>
        </div>
    `).join('');
}

// Appointment Management
async function showTimeSlots(date) {
    try {
        const response = await fetch(`/api/appointments?date=${date}&dieticianId=${getCurrentUserId()}`);
        const appointments = await response.json();
        
        // Generate time slots (9:00 to 17:00)
        const slots = [];
        for (let hour = 9; hour < 17; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const isBooked = appointments.some(apt => apt.time === time);
                slots.push({ time, isBooked });
            }
        }

        displayTimeSlots(slots, date);
    } catch (error) {
        console.error('Error fetching time slots:', error);
        showNotification('Erreur lors de la récupération des créneaux', 'error');
    }
}

function displayTimeSlots(slots, date) {
    timeSlots.innerHTML = slots.map(slot => `