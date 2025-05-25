// DOM Elements
const loginForm = document.getElementById('login-form');
const loginPage = document.getElementById('login-page');
const mainInterface = document.getElementById('main-interface');
const userRole = document.getElementById('user-role');
const logoutBtn = document.getElementById('logout-btn');
const patientForm = document.getElementById('patient-form');
const editPatientForm = document.getElementById('edit-patient-form');
const patientModal = document.getElementById('patient-modal');
const closeModal = document.querySelector('.close');
const calendar = document.getElementById('calendar');
const timeSlots = document.getElementById('time-slots');

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/me', {
            credentials: 'include' // Important: include credentials in the request
        });
        if (response.ok) {
            const user = await response.json();
            console.log('Auth check - User:', user); // Debug log
            if (mainInterface && loginPage) {
                showMainInterface(user);
            } else {
                showLoginPage();
            }
        } else {
            console.log('Auth check - Not authenticated'); // Debug log
            showLoginPage();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        showLoginPage();
    }
});

// Login form submission
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username')?.value;
        const password = document.getElementById('password')?.value;
        const errorDiv = document.getElementById('login-error');

        if (!username || !password) {
            if (errorDiv) {
                errorDiv.textContent = 'Veuillez remplir tous les champs';
                errorDiv.style.display = 'block';
            }
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // Important: include credentials in the request
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Login successful:', data); // Debug log
                // Redirect based on role
                switch (data.role) {
                    case 'admin':
                        window.location.href = '/admin.html';
                        break;
                    case 'reception':
                        window.location.href = '/reception.html';
                        break;
                    case 'dieteticien':
                        window.location.href = '/dietician.html';
                        break;
                    default:
                        console.error('Unknown role:', data.role);
                        if (errorDiv) {
                            errorDiv.textContent = 'Rôle utilisateur inconnu';
                            errorDiv.style.display = 'block';
                        }
                }
            } else {
                console.error('Login failed:', data);
                if (errorDiv) {
                    errorDiv.textContent = data.error || 'Erreur de connexion';
                    errorDiv.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            if (errorDiv) {
                errorDiv.textContent = 'Erreur de connexion au serveur';
                errorDiv.style.display = 'block';
            }
        }
    });
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
            showLoginPage();
        } catch (error) {
            console.error('Error during logout:', error);
        }
    });
}

function showMainInterface(user) {
    if (loginPage) loginPage.style.display = 'none';
    if (mainInterface) {
        mainInterface.style.display = 'block';
        if (userRole) userRole.textContent = `Connecté en tant que ${user.role}`;
        
        // Initialize calendar and load today's appointments
        if (calendar) initializeCalendar();
        loadTodayAppointments();
    }
}

function showLoginPage() {
    if (loginPage) loginPage.style.display = 'flex';
    if (mainInterface) mainInterface.style.display = 'none';
    if (loginForm) {
        loginForm.reset();
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) errorDiv.textContent = '';
    }
}

// Initialize Calendar
function initializeCalendar() {
    if (!calendar) return;
    
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
    }
}

function displayPatients(patients) {
    const resultsDiv = document.getElementById('search-results');
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
            </div>
        </div>
    `).join('');
}

// Add new patient
patientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientData = {
        first_name: document.getElementById('first-name').value,
        last_name: document.getElementById('last-name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value
    };

    try {
        const response = await fetch('/api/patients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(patientData)
        });
        
        if (response.ok) {
            patientForm.reset();
            searchPatient(); // Refresh the patient list
            showNotification('Patient ajouté avec succès');
        }
    } catch (error) {
        console.error('Error adding patient:', error);
        showNotification('Erreur lors de l\'ajout du patient', 'error');
    }
});

// Edit patient
function openEditModal(patientId) {
    fetch(`/api/patients/${patientId}`)
        .then(response => response.json())
        .then(patient => {
            document.getElementById('edit-patient-id').value = patient.id;
            document.getElementById('edit-first-name').value = patient.first_name;
            document.getElementById('edit-last-name').value = patient.last_name;
            document.getElementById('edit-phone').value = patient.phone;
            document.getElementById('edit-email').value = patient.email;
            document.getElementById('edit-address').value = patient.address;
            patientModal.style.display = 'block';
        });
}

editPatientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientId = document.getElementById('edit-patient-id').value;
    const patientData = {
        first_name: document.getElementById('edit-first-name').value,
        last_name: document.getElementById('edit-last-name').value,
        phone: document.getElementById('edit-phone').value,
        email: document.getElementById('edit-email').value,
        address: document.getElementById('edit-address').value
    };

    try {
        const response = await fetch(`/api/patients/${patientId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(patientData)
        });
        
        if (response.ok) {
            patientModal.style.display = 'none';
            searchPatient(); // Refresh the patient list
            showNotification('Patient modifié avec succès');
        }
    } catch (error) {
        console.error('Error updating patient:', error);
        showNotification('Erreur lors de la modification du patient', 'error');
    }
});

// Appointment Management
async function showTimeSlots(date) {
    try {
        const response = await fetch(`/api/appointments?date=${date}`);
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
    }
}

function displayTimeSlots(slots, date) {
    timeSlots.innerHTML = slots.map(slot => `
        <div class="time-slot ${slot.isBooked ? 'unavailable' : ''}" 
             onclick="${!slot.isBooked ? `bookAppointment('${date}', '${slot.time}')` : ''}">
            ${slot.time}
        </div>
    `).join('');
}

async function bookAppointment(date, time) {
    // Show patient search for booking
    const patientId = await prompt('Entrez l\'ID du patient:');
    if (!patientId) return;

    try {
        const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                patient_id: patientId,
                date,
                time
            })
        });

        if (response.ok) {
            showTimeSlots(date); // Refresh time slots
            searchAppointments(); // Refresh appointment list
            showNotification('Rendez-vous ajouté avec succès');
        }
    } catch (error) {
        console.error('Error booking appointment:', error);
        showNotification('Erreur lors de l\'ajout du rendez-vous', 'error');
    }
}

async function searchAppointments() {
    const date = document.getElementById('appointment-date').value;
    if (!date) return;

    try {
        const response = await fetch(`/api/appointments?date=${date}`);
        const appointments = await response.json();
        displayAppointments(appointments);
    } catch (error) {
        console.error('Error searching appointments:', error);
    }
}

function displayAppointments(appointments) {
    const listDiv = document.getElementById('appointment-list');
    listDiv.innerHTML = appointments.map(apt => `
        <div class="appointment-card">
            <h3>${apt.first_name} ${apt.last_name}</h3>
            <p><i class="fas fa-calendar"></i> ${apt.date}</p>
            <p><i class="fas fa-clock"></i> ${apt.time}</p>
            <div class="action-buttons">
                <button class="edit-btn" onclick="editAppointment(${apt.id})">
                    <i class="fas fa-edit"></i> Modifier
                </button>
                <button class="cancel-btn" onclick="cancelAppointment(${apt.id})">
                    <i class="fas fa-times"></i> Annuler
                </button>
            </div>
        </div>
    `).join('');
}

async function editAppointment(appointmentId) {
    // Show calendar for rescheduling
    $(calendar).fullCalendar('today');
}

async function cancelAppointment(appointmentId) {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) return;

    try {
        const response = await fetch(`/api/appointments/${appointmentId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            searchAppointments(); // Refresh appointment list
            showNotification('Rendez-vous annulé avec succès');
        }
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showNotification('Erreur lors de l\'annulation du rendez-vous', 'error');
    }
}

// Today's Appointments
async function loadTodayAppointments() {
    const today = new Date().toISOString().split('T')[0];
    try {
        const response = await fetch(`/api/appointments?date=${today}`);
        const appointments = await response.json();
        displayTodayAppointments(appointments);
    } catch (error) {
        console.error('Error loading today\'s appointments:', error);
    }
}

function displayTodayAppointments(appointments) {
    const todayList = document.getElementById('today-list');
    todayList.innerHTML = appointments.map(apt => `
        <div class="appointment-item ${apt.status === 'cancelled' ? 'cancelled' : ''}">
            <div>
                <strong>${apt.time}</strong> - ${apt.first_name} ${apt.last_name}
            </div>
            <div class="action-buttons">
                <button onclick="validateAppointment(${apt.id})">
                    <i class="fas fa-check"></i> Valider
                </button>
                <button onclick="cancelAppointment(${apt.id})">
                    <i class="fas fa-times"></i> Annuler
                </button>
            </div>
        </div>
    `).join('');
}

async function validateAppointment(appointmentId) {
    // Send notification to dietician
    showNotification('Notification envoyée au diététicien');
}

// Modal close button
if (closeModal) {
    closeModal.onclick = function() {
        if (patientModal) patientModal.style.display = 'none';
    }
}

window.onclick = function(event) {
    if (patientModal && event.target == patientModal) {
        patientModal.style.display = 'none';
    }
}

// Notification system
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        ${message}
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
} 