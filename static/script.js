let currentData = null;
let sectorChart = null;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    updateStats();
});

function setupEventListeners() {
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    document.getElementById('attachmentInput').addEventListener('change', handleAttachmentUpload);
    
    // Sauvegarde automatique des configurations
    ['emailColumn', 'nameColumn', 'companyColumn', 'sectorColumn', 
     'smtpEmail', 'smtpPassword', 'smtpProvider', 'smtpServer', 'smtpPort',
     'emailSubject', 'emailTemplate'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', saveConfig);
        }
    });
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        showNotification('Chargement du fichier...', 'info');
        const response = await fetch('/upload', { method: 'POST', body: formData });
        const result = await response.json();

        if (result.success) {
            currentData = result;
            displayFilePreview(result);
            populateColumnSelects(result.columns);
            showSections();
            showNotification('Fichier chargé avec succès!', 'success');
            updateStats();
        } else {
            showNotification(result.error, 'error');
        }
    } catch (error) {
        showNotification('Erreur lors du chargement', 'error');
    }
}

function displayFilePreview(data) {
    const preview = document.getElementById('filePreview');
    preview.innerHTML = `
        <h4>Aperçu (${data.total_rows} lignes)</h4>
        <div class="table-container">
            <table>
                <thead>
                    <tr>${data.columns.map(col => `<th>${col}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${data.preview.map(row => 
                        `<tr>${data.columns.map(col => `<td>${row[col] || ''}</td>`).join('')}</tr>`
                    ).join('')}
                </tbody>
            </table>
        </div>
    `;
    preview.style.display = 'block';
}

function populateColumnSelects(columns) {
    const selects = ['emailColumn', 'nameColumn', 'companyColumn', 'sectorColumn', 'previewSelect'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Sélectionner...</option>' + 
                columns.map(col => `<option value="${col}">${col}</option>`).join('');
        }
    });
}

function showSections() {
    ['mappingSection', 'smtpSection', 'templateSection', 'previewSection', 'sendSection', 'statsSection'].forEach(id => {
        document.getElementById(id).style.display = 'block';
    });
}

async function saveConfig() {
    const config = {
        email_column: document.getElementById('emailColumn').value,
        name_column: document.getElementById('nameColumn').value,
        company_column: document.getElementById('companyColumn').value,
        sector_column: document.getElementById('sectorColumn').value,
        smtp_email: document.getElementById('smtpEmail').value,
        smtp_password: document.getElementById('smtpPassword').value,
        smtp_provider: document.getElementById('smtpProvider').value,
        smtp_server: document.getElementById('smtpServer').value,
        smtp_port: document.getElementById('smtpPort').value,
        email_subject: document.getElementById('emailSubject').value,
        email_template: document.getElementById('emailTemplate').value
    };

    await fetch('/save_config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
}

function updateSmtpConfig() {
    const provider = document.getElementById('smtpProvider').value;
    const customFields = document.querySelectorAll('.custom-smtp');
    
    if (provider === 'Custom') {
        customFields.forEach(field => field.style.display = 'block');
    } else {
        customFields.forEach(field => field.style.display = 'none');
    }
}

async function handleAttachmentUpload(event) {
    const files = event.target.files;
    
    for (let file of files) {
        const formData = new FormData();
        formData.append('attachment', file);
        
        try {
            const response = await fetch('/upload_attachment', { method: 'POST', body: formData });
            const result = await response.json();
            
            if (result.success) {
                addAttachmentToList(result.filename, result.size);
                showNotification(`Fichier ${result.filename} ajouté`, 'success');
            } else {
                showNotification(result.error, 'error');
            }
        } catch (error) {
            showNotification('Erreur upload fichier', 'error');
        }
    }
}

function addAttachmentToList(filename, size) {
    const list = document.getElementById('attachmentList');
    const item = document.createElement('div');
    item.className = 'attachment-item';
    item.innerHTML = `
        <span>📎 ${filename} (${(size/1024).toFixed(1)} KB)</span>
        <button onclick="this.parentElement.remove()" class="btn-danger-small">×</button>
    `;
    list.appendChild(item);
}

async function updatePreview() {
    const select = document.getElementById('previewSelect');
    const index = select.selectedIndex - 1;
    
    if (index < 0) return;
    
    try {
        const response = await fetch(`/preview?row=${index}`);
        const result = await response.json();
        
        if (result.content) {
            document.getElementById('emailPreview').innerHTML = `
                <div class="preview-email">
                    <div class="email-subject"><strong>Sujet:</strong> ${result.subject}</div>
                    <div class="email-body">${result.content}</div>
                </div>
            `;
        }
    } catch (error) {
        showNotification('Erreur prévisualisation', 'error');
    }
}

async function sendEmails(type) {
    const progressSection = document.getElementById('sendProgress');
    const statusDiv = document.getElementById('sendStatus');
    const resultsDiv = document.getElementById('sendResults');
    
    progressSection.style.display = 'block';
    statusDiv.textContent = 'Envoi en cours...';
    
    try {
        const response = await fetch('/send_emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type })
        });
        
        const result = await response.json();
        
        if (result.success) {
            statusDiv.textContent = `✅ ${result.sent} emails envoyés`;
            showNotification(`${result.sent} emails envoyés avec succès!`, 'success');
            
            // Easter egg à 10 emails
            if (result.total_sent >= 10) {
                triggerCelebration();
            }
            
            if (result.errors.length > 0) {
                resultsDiv.innerHTML = `
                    <h4>Erreurs:</h4>
                    <ul>${result.errors.map(err => `<li>${err}</li>`).join('')}</ul>
                `;
                resultsDiv.style.display = 'block';
            }
            
            updateStats();
        } else {
            statusDiv.textContent = '❌ Erreur lors de l\'envoi';
            showNotification(result.error, 'error');
        }
    } catch (error) {
        statusDiv.textContent = '❌ Erreur de connexion';
        showNotification('Erreur lors de l\'envoi', 'error');
    }
}

async function updateStats() {
    try {
        const response = await fetch('/stats');
        const stats = await response.json();
        
        if (stats.error) return;
        
        // Mettre à jour les statistiques de la sidebar
        document.getElementById('stat-companies').textContent = stats.total_companies;
        document.getElementById('stat-sent').textContent = stats.emails_sent;
        
        // Mettre à jour les statistiques principales
        document.getElementById('totalCompanies').textContent = stats.total_companies;
        document.getElementById('validEmails').textContent = stats.valid_emails;
        document.getElementById('completeness').textContent = stats.completeness.toFixed(1) + '%';
        document.getElementById('emailsSent').textContent = stats.emails_sent;
        
        // Graphique des secteurs
        updateSectorChart(stats.sector_distribution);
        
    } catch (error) {
        console.error('Erreur stats:', error);
    }
}

function updateSectorChart(sectorData) {
    const ctx = document.getElementById('sectorChart').getContext('2d');
    
    if (sectorChart) {
        sectorChart.destroy();
    }
    
    const labels = Object.keys(sectorData);
    const data = Object.values(sectorData);
    
    sectorChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nombre d\'entreprises',
                data: data,
                backgroundColor: 'rgba(79, 172, 254, 0.6)',
                borderColor: 'rgba(79, 172, 254, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#e0e6ed' },
                    grid: { color: 'rgba(224, 230, 237, 0.1)' }
                },
                x: {
                    ticks: { color: '#e0e6ed' },
                    grid: { color: 'rgba(224, 230, 237, 0.1)' }
                }
            }
        }
    });
}

async function exportData() {
    try {
        const response = await fetch('/export_csv');
        const result = await response.json();
        
        if (result.success) {
            showNotification('Export CSV réussi!', 'success');
        } else {
            showNotification(result.error, 'error');
        }
    } catch (error) {
        showNotification('Erreur lors de l\'export', 'error');
    }
}

async function cleanEmails() {
    try {
        const response = await fetch('/clean_emails');
        const result = await response.json();
        
        if (result.success) {
            showNotification(`${result.removed} emails invalides supprimés`, 'success');
            updateStats();
        } else {
            showNotification(result.error, 'error');
        }
    } catch (error) {
        showNotification('Erreur lors du nettoyage', 'error');
    }
}

async function resetData() {
    if (confirm('Êtes-vous sûr de vouloir tout réinitialiser?')) {
        try {
            await fetch('/reset');
            location.reload();
        } catch (error) {
            showNotification('Erreur lors de la réinitialisation', 'error');
        }
    }
}

function showNotification(message, type) {
    const notifications = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notifications.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function triggerCelebration() {
    const celebration = document.getElementById('celebration');
    celebration.style.display = 'block';
    celebration.innerHTML = '🎉🎈🎊 Félicitations! 10 emails envoyés! 🎊🎈🎉';
    
    setTimeout(() => {
        celebration.style.display = 'none';
    }, 3000);
}