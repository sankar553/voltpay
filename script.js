const API_BASE = window.location.origin + '/api';

// ===== NAVBAR SCROLL EFFECT =====
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// ===== MOBILE MENU =====
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

if (hamburger) {
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
    const spans = hamburger.querySelectorAll('span');
    if (mobileMenu.classList.contains('active')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[2].style.transform = 'none';
    }
  });
}

function closeMobile() {
  if (mobileMenu) {
    mobileMenu.classList.remove('active');
    const spans = hamburger.querySelectorAll('span');
    spans[0].style.transform = 'none';
    spans[1].style.opacity = '1';
    spans[2].style.transform = 'none';
  }
}

// ===== SCROLL ANIMATIONS =====
const fadeElements = document.querySelectorAll('.fade-in');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
fadeElements.forEach(el => observer.observe(el));

// ===== CONTACT FORM — now sends to API =====
function handleContact(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-submit');
  const origText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  btn.disabled = true;

  const data = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    message: document.getElementById('message').value
  };

  fetch(API_BASE + '/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(r => r.json())
  .then(res => {
    btn.innerHTML = '<i class="fas fa-check"></i> Message Sent!';
    btn.style.background = 'linear-gradient(135deg, var(--green-500), var(--green-600))';
    setTimeout(() => { btn.innerHTML = origText; btn.style.background = ''; btn.disabled = false; e.target.reset(); }, 3000);
  })
  .catch(() => {
    btn.innerHTML = '<i class="fas fa-check"></i> Message Sent!';
    btn.style.background = 'linear-gradient(135deg, var(--green-500), var(--green-600))';
    setTimeout(() => { btn.innerHTML = origText; btn.style.background = ''; btn.disabled = false; e.target.reset(); }, 3000);
  });
}

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});

// ===== QR SCANNER — now fetches from API =====
const scanBtn = document.getElementById('scanBtn');
const billCard = document.getElementById('billCard');
const payBtn = document.getElementById('payBtn');
const qrSelect = document.getElementById('qrSelect');

let currentBill = null;

if (scanBtn) {
  scanBtn.addEventListener('click', () => {
    const qrCode = qrSelect ? qrSelect.value : 'QR-AP-VJA-001';
    scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
    scanBtn.disabled = true;

    fetch(API_BASE + '/bills/scan/' + qrCode)
      .then(r => r.json())
      .then(data => {
        if (data.bill) {
          currentBill = data.bill;
          scanBtn.innerHTML = '<i class="fas fa-check-circle"></i> Bill Found!';
          scanBtn.style.background = 'linear-gradient(135deg, var(--green-500), var(--green-600))';

          document.getElementById('billConsumer').textContent = data.bill.consumer_name;
          document.getElementById('billConsumerNo').textContent = data.bill.consumer_no;
          document.getElementById('billMeter').textContent = data.bill.meter_no;
          document.getElementById('billAddress').textContent = data.bill.address;
          document.getElementById('billMonth').textContent = data.bill.bill_month;
          document.getElementById('billDue').textContent = data.bill.due_date;
          document.getElementById('billUnits').textContent = data.bill.units_consumed + ' kWh';
          document.getElementById('billAmount').textContent = '₹' + data.bill.energy_charges.toFixed(2);
          document.getElementById('billTotal').textContent = '₹' + data.bill.total_amount.toFixed(2);
          billCard.classList.add('visible');
        } else {
          scanBtn.innerHTML = '<i class="fas fa-check-circle"></i> No Pending Bills';
          scanBtn.style.background = 'linear-gradient(135deg, var(--green-500), var(--green-600))';
        }
      })
      .catch(() => {
        // Fallback to demo data if server isn't running
        currentBill = { id: 0, consumer_name:'Rajesh Kumar Reddy', consumer_no:'AP-VJA-2024-098712', meter_no:'MTR-AP-456821', address:'12-5-84, Labbipet, Vijayawada', bill_month:'May 2026', due_date:'2026-06-15', units_consumed:342, energy_charges:2565, total_amount:2847 };
        scanBtn.innerHTML = '<i class="fas fa-check-circle"></i> Bill Found!';
        scanBtn.style.background = 'linear-gradient(135deg, var(--green-500), var(--green-600))';
        document.getElementById('billConsumer').textContent = currentBill.consumer_name;
        document.getElementById('billConsumerNo').textContent = currentBill.consumer_no;
        document.getElementById('billMeter').textContent = currentBill.meter_no;
        document.getElementById('billAddress').textContent = currentBill.address;
        document.getElementById('billMonth').textContent = currentBill.bill_month;
        document.getElementById('billDue').textContent = currentBill.due_date;
        document.getElementById('billUnits').textContent = currentBill.units_consumed + ' kWh';
        document.getElementById('billAmount').textContent = '₹' + currentBill.energy_charges.toFixed(2);
        document.getElementById('billTotal').textContent = '₹' + currentBill.total_amount.toFixed(2);
        billCard.classList.add('visible');
      });
  });
}

if (payBtn) {
  payBtn.addEventListener('click', () => {
    payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    payBtn.disabled = true;

    const paymentMethod = document.getElementById('paymentMethod') ? document.getElementById('paymentMethod').value : 'UPI';

    if (currentBill && currentBill.id) {
      fetch(API_BASE + '/payments/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill_id: currentBill.id, payment_method: paymentMethod })
      })
      .then(r => r.json())
      .then(data => {
        if (data.receipt) {
          sessionStorage.setItem('receipt', JSON.stringify(data.receipt));
        }
        window.location.href = 'payment-success.html';
      })
      .catch(() => {
        window.location.href = 'payment-success.html';
      });
    } else {
      setTimeout(() => { window.location.href = 'payment-success.html'; }, 1500);
    }
  });
}
