// --- Service Worker Registration ---
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
    showPage(savedPage, true);
}

document.addEventListener('DOMContentLoaded', loadState);

// --- Input Persistence Cleanup ---
document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('url-input');
    const dashboard = document.getElementById('results-dashboard');
    
    urlInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.trim() === '') {
            dashboard.style.display = 'none';
            localStorage.removeItem('shield_last_result');
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

// --- Digital Counter Animation ---
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
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
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(pageId === 'scanner' ? 'كاشف' : 'نصائح')) {
            btn.classList.add('active');
        }
    });

    document.querySelectorAll('.page-section').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId + '-page').classList.add('active');

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

// --- High Precision URL Helper ---
function parseAndValidateURL(rawInput) {
    let input = rawInput.trim();

    // 1. Check for spaces
    if (/\s/.test(input)) return null;

    // 2. Add protocol if missing for URL Parsing
    if (!/^https?:\/\//i.test(input)) {
        input = 'https://' + input;
    }

    try {
        const parsed = new URL(input);
        
        // Ensure hostname has a valid structure (must contain a dot or be IP/localhost)
        const hasValidHost = parsed.hostname.includes('.') || parsed.hostname === 'localhost';
        if (!hasValidHost) return null;

        return parsed;
    } catch (e) {
        return null;
    }
}

async function startScan() {
    const urlInput = document.getElementById('url-input');
    const scanBtn = document.getElementById('scan-btn');
    const rawUrl = urlInput.value.trim();
    
    if (!rawUrl) {
        alert("يرجى إدخال رابط للفحص.");
        return;
    }

    // Precise Validation Engine Check
    const parsedURL = parseAndValidateURL(rawUrl);

    if (!parsedURL) {
        alert("هذا ليس رابطاً صحيحاً! يرجى إدخال رابط معتمد مثل (example.com أو https://example.com)");
        return;
    }

    // UI Feedback
    const scannerBox = document.querySelector('.scanner-box');
    const dashboard = document.getElementById('results-dashboard');
    
    scannerBox.classList.add('scanning');
    scanBtn.classList.add('loading');
    
    setTimeout(() => {
        analyzeLink(parsedURL, rawUrl);
        scannerBox.classList.remove('scanning');
        scanBtn.classList.remove('loading');
        dashboard.style.display = 'grid';
        dashboard.scrollIntoView({ behavior: 'smooth' });
    }, 1200);
}

// Add Enter Key Listener
document.getElementById('url-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        startScan();
    }
});

// --- Advanced Heuristic Analysis Engine ---
function analyzeLink(parsedURL, rawInput) {
    let score = 0;
    let details = [];
    let tips = [];

    const protocol = parsedURL.protocol;
    const hostname = parsedURL.hostname.toLowerCase();
    const fullPath = parsedURL.href.toLowerCase();

    // 1. Protocol Verification
    if (protocol === 'http:') {
        score += 35;
        details.push({ label: 'تشفير الموقع', status: 'غير آمن (HTTP)', type: 'danger' });
        tips.push('الموقع غير مشفر؛ لا تدخل كلمات مرور أو معلومات حساسة عبره.');
    } else if (protocol === 'https:') {
        details.push({ label: 'تشفير الموقع', status: 'آمن (HTTPS)', type: 'safe' });
    }

    // 2. IP Address Host Check
    const isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    if (isIP) {
        score += 45;
        details.push({ label: 'عنوان النطاق', status: 'عنوان IP مباشر', type: 'danger' });
        tips.push('المواقع الشرعية تستخدم أسماء نطاقات وليس عناوين IP مباشرة.');
    }

    // 3. Non-Standard Port Analysis
    if (parsedURL.port && !['80', '443'].includes(parsedURL.port)) {
        score += 20;
        details.push({ label: 'منفذ الاتصال', status: `منفذ غير معتاد (${parsedURL.port})`, type: 'danger' });
        tips.push('استخدام منافذ مخصصة يُستخدم أحياناً للالتفاف على أنظمة الفلترة الأمنية.');
    }

    // 4. Suspicious TLD Check
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.zip', '.mov', '.work', '.click'];
    const hasSuspiciousTLD = suspiciousTLDs.some(tld => hostname.endsWith(tld));
    if (hasSuspiciousTLD) {
        score += 30;
        details.push({ label: 'امتداد النطاق', status: 'مشبوه مجاني/رخيص', type: 'danger' });
        tips.push('النطاقات المجانية أو المجهولة تُستغل بكثرة في الحملات الاحتيالية.');
    } else if (!isIP) {
        details.push({ label: 'امتداد النطاق', status: 'نطاق قياسي', type: 'safe' });
    }

    // 5. Excessive Subdomains Check
    const domainParts = hostname.split('.');
    if (domainParts.length > 3 && !isIP) {
        score += 20;
        details.push({ label: 'النطاقات الفرعية', status: 'كثرة النطاقات الفرعية', type: 'danger' });
        tips.push('دمج أكثر من نطاق فرعي يستهدف إخفاء الرابط الحقيقي للموقع.');
    }

    // 6. Sensational Phishing Keywords
    const phishingKeywords = ['login', 'verify', 'secure', 'bank', 'update', 'account', 'gift', 'win', 'prize', 'free', 'wallet', 'claim', 'bonus', 'support'];
    const foundKeywords = phishingKeywords.filter(kw => fullPath.includes(kw));
    if (foundKeywords.length > 0) {
        score += Math.min(foundKeywords.length * 15, 30);
        details.push({ label: 'كلمات مفتاحية', status: 'كلمات استدراجية', type: 'danger' });
        tips.push(`يحتوي الرابط على كلمات حساسة (${foundKeywords.slice(0, 3).join(', ')}) تستخدم غالباً لاستدراج الضحايا.`);
    }

    // 7. Typosquatting / Brand Imitation
    const brandTargets = ['google', 'facebook', 'instagram', 'paypal', 'apple', 'microsoft', 'amazon', 'binance', 'netflix', 'whatsapp'];
    let brandImitated = false;

    brandTargets.forEach(brand => {
        if (hostname.includes(brand)) {
            const isExactMatch = hostname === `${brand}.com` || hostname.endsWith(`.${brand}.com`);
            if (!isExactMatch) {
                brandImitated = true;
                score += 45;
                tips.push(`الرابط يحاول انتحال العلامة التجارية (${brand}). تحقق من الحروف بدقة.`);
            }
        }
    });

    if (brandImitated) {
        details.push({ label: 'فحص انتحال الهوية', status: 'انتحال علامة تجارية', type: 'danger' });
    } else {
        details.push({ label: 'فحص انتحال الهوية', status: 'لا يوجد انتحال واضح', type: 'safe' });
    }

    // 8. Symbol '@' Detection
    if (rawInput.includes('@')) {
        score += 50;
        details.push({ label: 'تحليل الرموز', status: 'رمز @ مشبوه', type: 'danger' });
        tips.push('وجود الرمز @ في الرابط يُستخدم لتجاهل كل ما قبله وتوجيهك لرابط آخر خفي.');
    }

    // Cap Score at 100
    score = Math.min(score, 100);
    updateResultUI(score, details, tips);
    animateValue('score-val', 0, score, 1500);
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

    // Meter Fill Logic
    const dashOffset = 283 - (283 * score / 100);
    meterFill.style.strokeDashoffset = dashOffset;

    // Severity Colors & Text
    let color = 'var(--neon-green)';
    let status = 'آمن وسليم';
    if (score > 25) { color = '#ffeb3b'; status = 'مخاطرة منخفضة'; }
    if (score > 55) { color = '#ff9800'; status = 'مخاطرة متوسطة إلى عالية'; }
    if (score > 75) { color = 'var(--neon-red)'; status = 'رابط احتيالي مؤكد'; }

    const scoreCard = document.querySelector('.score-card');
    if (score > 65) {
        scoreCard.classList.add('danger-active');
    } else {
        scoreCard.classList.remove('danger-active');
    }

    meterFill.style.stroke = color;
    scoreVal.style.color = color;
    riskStatus.innerText = status;
    riskStatus.style.color = color;

    // Render Analysis List
    analysisList.innerHTML = details.map(item => `
        <li class="analysis-item">
            <span class="item-label">${item.label}</span>
            <span class="item-status ${item.type}">${item.status}</span>
        </li>
    `).join('');

    // Render Tips Section
    if (tips.length === 0) tips.push('الرابط اجتاز جميع الفحوصات الأولية بنجاح. كن حذراً دائماً قبل إدخال أي بيانات.');
    tipsContainer.innerHTML = '';
    
    tips.forEach((tip, index) => {
        const div = document.createElement('div');
        div.className = 'tip-item reveal-init';
        div.textContent = tip;
        div.style.transitionDelay = (index * 0.1) + 's';
        tipsContainer.appendChild(div);
        
        setTimeout(() => div.classList.add('reveal-active'), 40);
    });

    // Show Copy Report Button
    document.getElementById('copy-report-btn').style.display = 'block';
}

// --- Copy Warning Report Helper ---
function copyReport() {
    const scoreVal = document.getElementById('score-val').innerText;
    const riskStatus = document.getElementById('risk-status').innerText;
    const urlInput = document.getElementById('url-input').value;

    const reportText = `🛡️ *تقرير فحص الرابط عبر Link Shield*\n\n` +
                       `🔗 الرابط: ${urlInput}\n` +
                       `⚠️ نسبة الخطورة: ${scoreVal}\n` +
                       `📌 الحالة: ${riskStatus}\n\n` +
                       `احذر دائماً قبل إدخال بياناتك الشخصية!`;

    navigator.clipboard.writeText(reportText).then(() => {
        alert("تم نسخ تقرير الفحص بنجاح!");
    }).catch(err => {
        console.error("فشل النسخ: ", err);
    });
}
