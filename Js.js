/**
 * Link Shield Logic
 * Heuristic Analysis & Page Navigation
 */

// --- Service Worker Registration (Offline Support) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Link Shield Service Worker Registered!'))
            .catch(err => console.log('Service Worker Error:', err));
    });
}

// --- Theme Management ---
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('shield_theme', isLight ? 'light' : 'dark');
}

function loadState() {
    const savedTheme = localStorage.getItem('shield_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }

    const savedPage = localStorage.getItem('shield_page') || 'scanner';
    showPage(savedPage, true); // Pass true to indicate it's an initial load
}

document.addEventListener('DOMContentLoaded', loadState);

// --- Input & Results Persistence ---
document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('url-input');
    const dashboard = document.getElementById('results-dashboard');
    
    urlInput.addEventListener('input', (e) => {
        const val = e.target.value;
        // Persistence removed as per user request
        
        if (val.trim() === '') {
            dashboard.style.display = 'none';
            localStorage.removeItem('shield_last_result');
            // Reset meter visually
            document.getElementById('meter-fill').style.strokeDashoffset = 283;
            document.getElementById('score-val').innerText = '0%';
        }
    });
});

// --- Reveal Observer ---
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('reveal-active');
        }
    });
}, { threshold: 0.1 });

function initReveal() {
    document.querySelectorAll('.card, .edu-card').forEach(el => {
        el.classList.add('reveal-init');
        revealObserver.observe(el);
    });
}

document.addEventListener('DOMContentLoaded', initReveal);

// --- Digital Counter ---
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // Easing function (outQuad)
        const easedProgress = progress * (2 - progress);
        const currentVal = Math.floor(easedProgress * (end - start) + start);
        obj.innerHTML = currentVal + "%";
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function showPage(pageId, isInitialLoad = false) {
    // Add active class to buttons
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(pageId === 'scanner' ? 'كاشف' : 'نصائح')) {
            btn.classList.add('active');
        }
    });

    // Switch visible section
    document.querySelectorAll('.page-section').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId + '-page').classList.add('active');

    // Persist page state
    localStorage.setItem('shield_page', pageId);

    if (pageId === 'scanner') {
        if (!isInitialLoad) {
            document.getElementById('results-dashboard').style.display = 'none';
            document.getElementById('url-input').value = '';
            localStorage.removeItem('shield_last_url');
            localStorage.removeItem('shield_last_result');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

async function startScan() {
    const urlInput = document.getElementById('url-input');
    const url = urlInput.value.trim();
    
    if (!url) {
        alert("يرجى إدخال رابط للفحص.");
        return;
    }

    // Simplified URL Validation
    // Accepts any string with a dot or protocol, rejects plain text/numbers with no structure
    const isLink = url.includes('.') || /^(https?:\/\/|www\.)/i.test(url);
    const hasSpace = /\s/.test(url);

    if (!isLink || hasSpace) {
        alert("هذا ليس رابطاً صحيحاً! يرجى إدخال رابط صالح لفحصه.");
        return;
    }

    // UI Feedback
    const scannerBox = document.querySelector('.scanner-box');
    const dashboard = document.getElementById('results-dashboard');
    scannerBox.classList.add('scanning');
    
    // Simulate Processing Time for Realistic Feel
    setTimeout(() => {
        analyzeLink(url);
        scannerBox.classList.remove('scanning');
        dashboard.style.display = 'grid';
        dashboard.scrollIntoView({ behavior: 'smooth' });
    }, 1500);
}

// Add Enter Key Listener
document.getElementById('url-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        startScan();
    }
});

function analyzeLink(url) {
    let score = 0;
    let details = [];
    let tips = [];

    // 1. Protocol Check (HTTPS vs HTTP)
    if (url.startsWith('http://')) {
        score += 30;
        details.push({ label: 'تشفير الموقع', status: 'خطر (HTTP)', type: 'danger' });
        tips.push('الموقع لا يشفر بياناتك، لا تدخل أي كلمات مرور أو معلومات بنكية.');
    } else if (url.startsWith('https://')) {
        details.push({ label: 'تشفير الموقع', status: 'آمن (HTTPS)', type: 'safe' });
    } else {
        score += 10;
        details.push({ label: 'تشفير الموقع', status: 'غير معروف', type: 'danger' });
    }

    // 2. Domain & TLD Analysis
    const domainMatch = url.match(/:\/\/(.[^/]+)/);
    const domain = domainMatch ? domainMatch[1] : url;

    // Check for suspicious TLDs (cheap/free ones often used for phishing)
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top'];
    if (suspiciousTLDs.some(tld => domain.endsWith(tld))) {
        score += 25;
        details.push({ label: 'امتداد النطاق', status: 'مشبوه', type: 'danger' });
        tips.push('المجربات المجانية (مثل .tk) تستخدم بكثرة في عمليات الاحتيال.');
    } else {
        details.push({ label: 'امتداد النطاق', status: 'عادي', type: 'safe' });
    }

    // 3. Keyword Analysis (Sensory Phishing)
    const phishingKeywords = ['login', 'verify', 'secure', 'bank', 'update', 'account', 'gift', 'win', 'prize'];
    const foundKeywords = phishingKeywords.filter(kw => url.toLowerCase().includes(kw));
    if (foundKeywords.length > 0) {
        score += (foundKeywords.length * 15);
        details.push({ label: 'الكلمات المفتاحية', status: 'تحذيرية', type: 'danger' });
        tips.push(`الرابط يحتوي على كلمات مثل (${foundKeywords.join(', ')}) التي تحاول إيهامك بالحاجة إلى إجراء عاجل.`);
    }

    // 4. Typosquatting (Simple Check)
    const commonSites = ['google', 'facebook', 'instagram', 'paypal', 'apple', 'microsoft', 'amazon'];
    commonSites.forEach(site => {
        if (domain.includes(site) && !domain.startsWith(site) && domain !== site + '.com') {
            score += 40;
            details.push({ label: 'تشابه أسماء', status: 'خداع بصري', type: 'danger' });
            tips.push(`هذا الرابط يحاول تقليد موقع ${site} الشهير، احذر من انتحال الشخصية.`);
        }
    });

    // 5. URL Length Analysis
    if (url.length > 100) {
        score += 20;
        details.push({ label: 'طول الرابط', status: 'طويل جداً', type: 'danger' });
        tips.push('الروابط الطويلة والمعقدة تستخدم أحياناً لإخفاء اسم الدومين الحقيقي.');
    }

    // Cap Score at 100
    score = Math.min(score, 100);
    updateResultUI(score, details, tips);
    
    // Animate score value
    animateValue('score-val', 0, score, 2000);
}

function updateResultUI(score, details, tips, isRestoring = false) {
    const meterFill = document.getElementById('meter-fill');
    const scoreVal = document.getElementById('score-val');
    const riskStatus = document.getElementById('risk-status');
    const analysisList = document.getElementById('analysis-list');
    const tipsContainer = document.getElementById('tips-container');

    if (!isRestoring) {
        localStorage.setItem('shield_last_result', JSON.stringify({ score, details, tips }));
    }

    // Update Meter
    const dashOffset = 283 - (283 * score / 100);
    meterFill.style.strokeDashoffset = dashOffset;
    // scoreVal.innerText = score + '%'; // Animation handles this now

    // Color based on risk
    let color = 'var(--neon-green)';
    let status = 'آمن جداً';
    if (score > 30) { color = '#ffeb3b'; status = 'مخاطرة منخفضة'; }
    if (score > 60) { color = '#ff9800'; status = 'مخاطرة عالية'; }
    if (score > 80) { color = 'var(--neon-red)'; status = 'رابط نصاب مؤكد'; }

    const scoreCard = document.querySelector('.score-card');
    if (score > 70) {
        scoreCard.classList.add('danger-active');
    } else {
        scoreCard.classList.remove('danger-active');
    }

    meterFill.style.stroke = color;
    scoreVal.style.color = color;
    riskStatus.innerText = status;
    riskStatus.style.color = color;

    // Render Analysis
    analysisList.innerHTML = details.map(item => `
        <li class="analysis-item">
            <span class="item-label">${item.label}</span>
            <span class="item-status ${item.type}">${item.status}</span>
        </li>
    `).join('');

    // Render Tips
    if (tips.length === 0) tips.push('الرابط يبدو سليماً، ولكن دائماً توخ الحذر عند إدخال بياناتك الشخصية.');
    tipsContainer.innerHTML = '';
    
    tips.forEach((tip, index) => {
        const div = document.createElement('div');
        div.className = 'tip-item reveal-init';
        div.textContent = tip;
        div.style.transitionDelay = (index * 0.15) + 's';
        tipsContainer.appendChild(div);
        
        // Trigger reveal after a small delay
        setTimeout(() => div.classList.add('reveal-active'), 50);
    });
}
