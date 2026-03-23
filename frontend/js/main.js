// TDT-CRM Main Logic
document.addEventListener('DOMContentLoaded', () => {
    console.log('TDT-CRM Dashboard Initialized');
    
    // Initial fetch from backend placeholder
    fetch('/api/status')
        .then(res => res.json())
        .then(data => console.log('Backend Status:', data))
        .catch(err => console.error('Backend connection test:', err));
});
