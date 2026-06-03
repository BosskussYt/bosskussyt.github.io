// Globaler Timer mit Server-Synchronisation

let timerInterval;
let alarmPlayed = false;

// Cookie Banner initialisieren
function initCookieBanner() {
    const banner = document.getElementById('cookieBanner');
    const accepted = localStorage.getItem('cookiesAccepted');
    
    if (accepted === 'true') {
        if (banner) banner.style.display = 'none';
    } else {
        if (banner) banner.style.display = 'flex';
    }
    
    const acceptBtn = document.getElementById('acceptCookies');
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
            localStorage.setItem('cookiesAccepted', 'true');
            if (banner) banner.style.display = 'none';
        });
    }
}

// Admin Panel (5x auf Timer klicken)
function initAdminPanel() {
    let clickCount = 0;
    const timerDiv = document.querySelector('.timer');
    const adminPanel = document.getElementById('adminPanel');
    
    if (timerDiv) {
        timerDiv.addEventListener('click', () => {
            clickCount++;
            if (clickCount === 5) {
                if (adminPanel) {
                    adminPanel.style.display = 'block';
                    clickCount = 0;
                }
            }
            setTimeout(() => { clickCount = 0; }, 2000);
        });
    }
    
    const resetBtn = document.getElementById('resetTimerBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            const password = document.getElementById('adminPassword').value;
            
            try {
                const response = await fetch('/api/reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('✅ Timer wurde zurückgesetzt! Seite wird neu geladen.');
                    location.reload();
                } else {
                    alert('❌ Falsches Passwort!');
                }
            } catch (error) {
                console.error('Fehler:', error);
                alert('Fehler beim Zurücksetzen des Timers!');
            }
        });
    }
}

// Server abfragen für aktuelle Zeit
async function fetchTimeLeft() {
    try {
        const response = await fetch('/api/time-left');
        const data = await response.json();
        return data.timeLeft;
    } catch (error) {
        console.error('Fehler beim Abrufen der Server-Zeit:', error);
        return null;
    }
}

// Timer-Anzeige aktualisieren
function updateDisplay(timeLeft) {
    if (timeLeft === null) {
        document.getElementById('days').textContent = '??';
        document.getElementById('hours').textContent = '??';
        document.getElementById('minutes').textContent = '??';
        document.getElementById('seconds').textContent = '??';
        return;
    }
    
    if (timeLeft <= 0) {
        document.getElementById('days').textContent = '00';
        document.getElementById('hours').textContent = '00';
        document.getElementById('minutes').textContent = '00';
        document.getElementById('seconds').textContent = '00';
        
        if (!alarmPlayed) {
            const alarm = document.getElementById('alarmSound');
            if (alarm) {
                alarm.play().catch(e => console.log('Audio konnte nicht abgespielt werden:', e));
            }
            const messageDiv = document.getElementById('message');
            if (messageDiv) {
                messageDiv.innerHTML = '🔔🔔🔔 ZEIT IST ABGELAUFEN! 🔔🔔🔔';
            }
            alarmPlayed = true;
        }
        return;
    }
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (86400000)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (3600000)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (60000)) / 1000);
    
    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}

// Haupt-Timer starten
async function startTimer() {
    let serverTimeLeft = await fetchTimeLeft();
    
    if (serverTimeLeft === null) {
        // Fallback: Zeige Fehler an, aber versuche weiter
        updateDisplay(null);
        setTimeout(startTimer, 5000);
        return;
    }
    
    updateDisplay(serverTimeLeft);
    
    // Lokalen Countdown starten (sync mit Server)
    timerInterval = setInterval(() => {
        serverTimeLeft -= 1000;
        
        if (serverTimeLeft <= 0) {
            clearInterval(timerInterval);
            updateDisplay(0);
        } else {
            updateDisplay(serverTimeLeft);
        }
    }, 1000);
    
    // Alle 5 Minuten mit Server resynchronisieren (verhindert Drift)
    setInterval(async () => {
        const freshTimeLeft = await fetchTimeLeft();
        if (freshTimeLeft !== null && freshTimeLeft > 0) {
            serverTimeLeft = freshTimeLeft;
        }
    }, 300000); // 5 Minuten
}

// Alles initialisieren wenn Seite geladen
document.addEventListener('DOMContentLoaded', () => {
    initCookieBanner();
    initAdminPanel();
    startTimer();
});
