/* ==================================================================
   Database Bangunan Irigasi — Frontend JS (Fix SyntaxError & 429)
   ================================================================== */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwntuQZScQM4BYkgf6RhrAu2zUpVeeW18vmsVFYl_KdDXf5_z1gV_lfVlSfCoYLmy4x/exec';

/* ---------- State Global ---------- */
let allData = [];
let filteredData = [];
let displayedData = []; 
let searchQuery = '';
let activeKategori = 'all';
let activeDesa = 'all';
let activeSaluran = 'all';

// Paginasi
let currentPage = 1;
const ITEMS_PER_PAGE = 20;

// Lightbox
let currentImages = [];
let currentImageIndex = 0;

// Chart Instances
let chartKategoriInstance = null;
let chartDesaInstance = null;

/* ---------- Element Selectors ---------- */
const el = {
  pageList: document.getElementById('pageList'),
  pageChart: document.getElementById('pageChart'),
  errorBox: document.getElementById('errorBox'),
  emptyState: document.getElementById('emptyState'),
  dataList: document.getElementById('dataList'),
  skeletonLoader: document.getElementById('skeletonLoader'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  searchInput: document.getElementById('searchInput'),
  searchInputMobile: document.getElementById('searchInputMobile'),
  clearSearch: document.getElementById('clearSearch'),
  filterKategori: document.getElementById('filterKategori'),
  filterDesa: document.getElementById('filterDesa'),
  filterSaluran: document.getElementById('filterSaluran'),
  filterKategoriMobile: document.getElementById('filterKategoriMobile'),
  filterDesaMobile: document.getElementById('filterDesaMobile'),
  filterSaluranMobile: document.getElementById('filterSaluranMobile'),
  totalData: document.getElementById('totalData'),
  totalDesa: document.getElementById('totalDesa'),
  totalSaluran: document.getElementById('totalSaluran'),
  filteredDataCount: document.getElementById('filteredDataCount'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalContent: document.getElementById('modalContent'),
  modalClose: document.getElementById('modalClose'),
  imageViewer: document.getElementById('imageViewer'),
  viewerImg: document.getElementById('viewerImg'),
  viewerOpen: document.getElementById('viewerOpen'),
  viewerClose: document.getElementById('viewerClose'),
  viewerPrev: document.getElementById('viewerPrev'),
  viewerNext: document.getElementById('viewerNext'),
  viewerDots: document.getElementById('viewerDots'),
  bottomNav: document.getElementById('bottomNav'),
  navBtnHome: document.getElementById('navBtnHome'),
  navDesktopHome: document.getElementById('navDesktopHome'),
  navDesktopChart: document.getElementById('navDesktopChart'),
  mobileChartBtn: document.getElementById('mobileChartBtn'),
  refreshBtnMobile: document.getElementById('refreshBtnMobile'),
  mobileSearchBtn: document.getElementById('mobileSearchBtn'),
  filterOverlay: document.getElementById('filterOverlay'),
  openFilterBtn: document.getElementById('openFilterBtn'),
  mobileFilterBtn: document.getElementById('mobileFilterBtn'),
  closeFilterBtn: document.getElementById('closeFilterBtn'),
  applyFilterBtn: document.getElementById('applyFilterBtn')
};

/* ---------- Utilities ---------- */
function driveIdToDirect(id) {
  if (!id || id === 'N/A' || id === '-' || id === '') return null;
  return `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
}
function driveIdToView(id) {
  if (!id || id === 'N/A' || id === '-' || id === '') return null;
  return `https://drive.google.com/file/d/${id}/view`;
}
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function formatDate(ts) {
  if (!ts) return '-';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return ts; }
}
function normalizeRow(row) {
  return {
    timestamp: row.Timestamp || row.timestamp || '',
    nama: row.Nama || row.nama || '',
    jenis: row['Jenis Bangunan'] || row.jenis || '',
    desa: row.Desa || row.desa || '',
    kecamatan: row.Kecamatan || row.kecamatan || '',
    kabupaten: row.Kabupaten || row.kabupaten || '',
    saluran: row['Saluran Irigasi'] || row.saluran || '',
    keterangan: row.Keterangan || row.keterangan || '',
    fotoId: row['ID File Foto Bangunan'] || row.fotoId || '',
    fotoUrl: row['URL Foto Bangunan'] || row.fotoUrl || '',
    ijinUrl: row['URL Foto Ijin'] || row.ijinUrl || '',
    ijinId: row['ID File Foto Ijin'] || row.ijinId || '',
    lainUrl: row['URL Foto Lain'] || row.lainUrl || '',
    lainId: row['ID File Foto Lain'] || row.lainId || '',
  };
}

// Base64 SVG Placeholder yang aman (tanpa tanda kutip yang merusak HTML)
const defaultImageSvg = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%23F4F1EA"%3E%3Crect width="100" height="100"/%3E%3Cpath d="M30 70h40V40H30v30zm5-25h30v20H35V45z" fill="%23C7C7CC"/%3E%3C/svg%3E';

/* ---------- Skeleton Loading Logic ---------- */
function showSkeleton() {
  if (!el.skeletonLoader) return;
  el.skeletonLoader.style.display = 'grid';
  el.skeletonLoader.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    el.skeletonLoader.innerHTML += `
      <div class="skeleton-card">
        <div class="skeleton-thumb"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line badge"></div>
        </div>
      </div>
    `;
  }
}
function hideSkeleton() {
  if (el.skeletonLoader) {
    el.skeletonLoader.style.display = 'none';
    el.skeletonLoader.innerHTML = '';
  }
}

/* ---------- Load Data (JSONP) ---------- */
function loadData() {
  showSkeleton();
  if (el.errorBox) el.errorBox.style.display = 'none';
  if (el.dataList) el.dataList.innerHTML = '';
  if (el.loadMoreBtn) el.loadMoreBtn.style.display = 'none';
  if (el.emptyState) el.emptyState.style.display = 'none';

  const oldScript = document.getElementById('jsonp-script');
  if (oldScript) oldScript.remove();

  const callbackName = 'gasCallback_' + Date.now();
  
  window[callbackName] = function(response) {
    try {
      if (response.status === 'error') throw new Error(response.message);
      
      const rows = response.data || [];
      allData = rows.map(normalizeRow).filter(r => r.nama || r.desa);
      
      if (el.totalData) el.totalData.textContent = allData.length;
      const uniqueDesa = [...new Set(allData.map(i => i.desa).filter(Boolean))];
      const uniqueSaluran = [...new Set(allData.map(i => i.saluran).filter(Boolean))];
      if (el.totalDesa) el.totalDesa.textContent = uniqueDesa.length;
      if (el.totalSaluran) el.totalSaluran.textContent = uniqueSaluran.length;
      
      populateFilters(uniqueDesa, uniqueSaluran);
      applyFilters();
      
    } catch (err) {
      showError(err.message);
    } finally {
      hideSkeleton();
      delete window[callbackName];
      const script = document.getElementById('jsonp-script');
      if (script) script.remove();
    }
  };

  const script = document.createElement('script');
  script.id = 'jsonp-script';
  script.src = `${GAS_URL}?action=getData&callback=${callbackName}&t=${Date.now()}`;
  script.onerror = () => { showError('Gagal memuat data.'); hideSkeleton(); };
  document.body.appendChild(script);
}

function showError(msg) {
  if (el.errorBox) {
    el.errorBox.style.display = 'block';
    el.errorBox.innerHTML = `<strong>Gagal memuat data:</strong> ${escapeHtml(msg)}`;
  }
  hideSkeleton();
}

/* ---------- Populate Filters ---------- */
function populateFilters(desaList, saluranList) {
  const currentDesa = el.filterDesa ? el.filterDesa.value : 'all';
  const currentSaluran = el.filterSaluran ? el.filterSaluran.value : 'all';

  let htmlDesa = `<option value="all">Semua Desa</option>`;
  desaList.sort().forEach(d => { htmlDesa += `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`; });
  
  let htmlSaluran = `<option value="all">Semua Saluran</option>`;
  saluranList.sort().forEach(s => { htmlSaluran += `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`; });

  if (el.filterDesa) { el.filterDesa.innerHTML = htmlDesa; el.filterDesa.value = currentDesa; }
  if (el.filterSaluran) { el.filterSaluran.innerHTML = htmlSaluran; el.filterSaluran.value = currentSaluran; }
  if (el.filterDesaMobile) { el.filterDesaMobile.innerHTML = htmlDesa.replace('Semua Desa', 'Desa: Semua'); el.filterDesaMobile.value = currentDesa; }
  if (el.filterSaluranMobile) { el.filterSaluranMobile.innerHTML = htmlSaluran.replace('Semua Saluran', 'Saluran: Semua'); el.filterSaluranMobile.value = currentSaluran; }
}

/* ---------- Filter & Pagination Logic ---------- */
function applyFilters() {
  const q = searchQuery.trim().toLowerCase();
  
  filteredData = allData.filter(item => {
    if (activeKategori !== 'all' && !(item.jenis || '').toLowerCase().includes(activeKategori.toLowerCase())) return false;
    if (activeDesa !== 'all' && item.desa !== activeDesa) return false;
    if (activeSaluran !== 'all' && item.saluran !== activeSaluran) return false;
    if (q) {
      const hay = [item.nama, item.desa, item.kecamatan, item.saluran, item.jenis, item.keterangan].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  
  if (el.filteredDataCount) el.filteredDataCount.textContent = filteredData.length;
  
  currentPage = 1;
  displayedData = [];
  if (el.dataList) el.dataList.innerHTML = '';
  if (el.emptyState) el.emptyState.style.display = 'none';

  if (filteredData.length === 0) {
    if (el.emptyState) el.emptyState.style.display = 'flex';
    if (el.loadMoreBtn) el.loadMoreBtn.style.display = 'none';
    updateCharts();
    return;
  }

  loadMoreData();
  updateCharts();
}

function loadMoreData() {
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const newItems = filteredData.slice(startIndex, endIndex);
  
  if (newItems.length === 0) return;

  renderList(newItems, displayedData.length);
  displayedData = displayedData.concat(newItems);
  currentPage++;
  
  if (endIndex >= filteredData.length) {
    if (el.loadMoreBtn) el.loadMoreBtn.style.display = 'none';
  } else {
    if (el.loadMoreBtn) el.loadMoreBtn.style.display = 'inline-block';
  }
}

/* ---------- Render List ---------- */
function renderList(items, startOffset = 0) {
  if (!el.dataList) return;
  const frag = document.createDocumentFragment();
  
  items.forEach((item, i) => {
    const thumb = driveIdToDirect(item.fotoId) || defaultImageSvg;
    const card = document.createElement('div');
    card.className = 'card';
    
    card.style.animation = `fadeIn 0.4s ease forwards`;
    card.style.animationDelay = `${Math.min((startOffset + i) * 20, 400)}ms`;
    card.style.opacity = '0';

    const arrowIcon = `<div class="card-arrow"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>`;
    
    // PERBAIKAN: Menggunakan event listener JS untuk handle error, bukan inline onerror
    card.innerHTML = `
      <div class="card-header">
        <img class="card-thumb" src="${thumb}" loading="lazy" />
        <div class="card-info">
          <div class="card-name">${escapeHtml(item.nama || '(Tanpa Nama)')}</div>
          <div class="card-sub"><span>${escapeHtml(item.desa || '-')}, ${escapeHtml(item.kecamatan || '-')}</span></div>
        </div>
        ${arrowIcon}
      </div>
      <div class="badges">
        <span class="badge">${escapeHtml(item.jenis || 'Bangunan')}</span>
        ${item.kabupaten ? `<span class="badge" style="background: rgba(255, 224, 51, 0.4); color:#000;">${escapeHtml(item.kabupaten)}</span>` : ''}
      </div>
    `;
    
    // Handle jika gambar gagal dimuat (429/Error)
    const imgEl = card.querySelector('.card-thumb');
    if (imgEl) {
      imgEl.onerror = function() {
        this.src = defaultImageSvg;
        this.onerror = null; // Cegah infinite loop
      };
    }

    card.addEventListener('click', () => openModal(item));
    frag.appendChild(card);
  });
  
  el.dataList.appendChild(frag);
}

/* ---------- Chart Logic ---------- */
function updateCharts() {
  if (!filteredData.length) return;

  const kategoriCount = {};
  filteredData.forEach(item => {
    const j = item.jenis || 'Lainnya';
    kategoriCount[j] = (kategoriCount[j] || 0) + 1;
  });
  const sortedKategori = Object.entries(kategoriCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const desaCount = {};
  filteredData.forEach(item => {
    const d = item.desa || 'Tidak Diketahui';
    desaCount[d] = (desaCount[d] || 0) + 1;
  });
  const sortedDesa = Object.entries(desaCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const ctxKat = document.getElementById('chartKategori');
  if (ctxKat) {
    if (chartKategoriInstance) chartKategoriInstance.destroy();
    chartKategoriInstance = new Chart(ctxKat, {
      type: 'doughnut',
      data: {
        labels: sortedKategori.map(k => k[0]),
        datasets: [{
          data: sortedKategori.map(k => k[1]),
          backgroundColor: ['#FFE033', '#0F2C59', '#8A8A8A', '#C7C7CC', '#E5E5EA'],
          borderWidth: 0
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: {family: 'Plus Jakarta Sans', size: 12, weight: '600'} } } }, cutout: '75%' }
    });
  }

  const ctxDesa = document.getElementById('chartDesa');
  if (ctxDesa) {
    if (chartDesaInstance) chartDesaInstance.destroy();
    chartDesaInstance = new Chart(ctxDesa, {
      type: 'bar',
      data: {
        labels: sortedDesa.map(d => d[0]),
        datasets: [{ label: 'Jumlah Bangunan', data: sortedDesa.map(d => d[1]), backgroundColor: '#0F2C59', borderRadius: 8 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, display: false }, x: { grid: { display: false }, ticks: { font: {family: 'Plus Jakarta Sans', size: 12, weight: '600'} } } } }
    });
  }
}

/* ---------- Modal & Lightbox Logic ---------- */
function openModal(item) {
  const imgHtml = buildImageGrid(item);
  el.modalContent.innerHTML = `
    <h2 style="font-size:24px; font-weight:800; margin-bottom:4px; letter-spacing:-0.5px;">${escapeHtml(item.nama || '(Tanpa Nama)')}</h2>
    <p style="color:var(--text-muted); font-weight:600; margin-bottom:16px;">${escapeHtml(item.jenis || '-')}</p>
    ${imgHtml}
    <div style="margin-top:20px; display:flex; flex-direction:column; gap:10px;">
      <div class="detail-row"><span class="detail-label">Desa</span><span class="detail-value">${escapeHtml(item.desa || '-')}</span></div>
      <div class="detail-row"><span class="detail-label">Kecamatan</span><span class="detail-value">${escapeHtml(item.kecamatan || '-')}</span></div>
      <div class="detail-row"><span class="detail-label">Kabupaten</span><span class="detail-value">${escapeHtml(item.kabupaten || '-')}</span></div>
      <div class="detail-row"><span class="detail-label">Saluran</span><span class="detail-value">${escapeHtml(item.saluran || '-')}</span></div>
      <div class="detail-row"><span class="detail-label">Keterangan</span><span class="detail-value" style="font-weight:600; font-size:13px; text-align:left; max-width:60%; line-height:1.4;">${escapeHtml(item.keterangan || '-')}</span></div>
      <div class="detail-row"><span class="detail-label">Waktu Input</span><span class="detail-value" style="font-size:12px;">${formatDate(item.timestamp)}</span></div>
    </div>
  `;
  el.modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Handle Image Error di Modal
  el.modalContent.querySelectorAll('.img-item img').forEach(img => {
    img.onerror = function() {
      this.parentNode.innerHTML = `<div class="img-empty">${this.alt}</div>`;
    };
  });

  el.modalContent.querySelectorAll('.img-item[data-img]').forEach(node => {
    node.addEventListener('click', () => {
      const allImgs = Array.from(el.modalContent.querySelectorAll('.img-item[data-img]'));
      currentImages = allImgs.map(n => ({ src: n.dataset.img, view: n.dataset.view, label: n.dataset.label }));
      currentImageIndex = allImgs.indexOf(node);
      openLightbox();
    });
  });
}

function closeModal() {
  el.modalOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

function buildImageGrid(item) {
  const items = [
    { label: 'Bangunan', id: item.fotoId, view: item.fotoUrl },
    { label: 'Ijin', id: item.ijinId, view: item.ijinUrl },
    { label: 'Lainnya', id: item.lainId, view: item.lainUrl },
  ];
  let html = '<div class="modal-images">';
  items.forEach(it => {
    const thumb = driveIdToDirect(it.id);
    if (thumb) {
      // PERBAIKAN: Menghapus inline onerror yang menyebabkan SyntaxError
      html += `<div class="img-item" data-img="${thumb}" data-view="${escapeHtml(it.view || '')}" data-label="${it.label}"><img src="${thumb}" alt="${it.label}" loading="lazy" /><div class="img-label">${it.label}</div></div>`;
    } else {
      html += `<div class="img-empty">${it.label}</div>`;
    }
  });
  html += '</div>';
  return html;
}

function openLightbox() {
  if (currentImages.length === 0) return;
  updateLightboxImage();
  el.imageViewer.classList.add('active');
}

function updateLightboxImage() {
  if (currentImages.length === 0) return;
  const current = currentImages[currentImageIndex];
  el.viewerImg.src = current.src;
  
  if (current.view && current.view !== 'N/A') {
    el.viewerOpen.href = current.view;
    el.viewerOpen.style.display = 'inline-block';
  } else {
    el.viewerOpen.style.display = 'none';
  }
  
  el.viewerPrev.style.display = currentImages.length > 1 ? 'grid' : 'none';
  el.viewerNext.style.display = currentImages.length > 1 ? 'grid' : 'none';
  
  if (el.viewerDots) {
    el.viewerDots.innerHTML = '';
    currentImages.forEach((_, idx) => {
      const dot = document.createElement('div');
      dot.className = `dot ${idx === currentImageIndex ? 'active' : ''}`;
      el.viewerDots.appendChild(dot);
    });
  }
}

function closeViewer() {
  el.imageViewer.classList.remove('active');
  el.viewerImg.src = '';
  currentImages = [];
  currentImageIndex = 0;
}

/* ---------- Touch Swipe Logic ---------- */
let touchStartX = 0;
let touchEndX = 0;
if (el.imageViewer) {
  el.imageViewer.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  el.imageViewer.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    if (currentImages.length <= 1) return;
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
      currentImageIndex = (currentImageIndex + 1) % currentImages.length;
      updateLightboxImage();
    }
    if (touchEndX > touchStartX + swipeThreshold) {
      currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
      updateLightboxImage();
    }
  }, { passive: true });
}

if (el.viewerPrev) el.viewerPrev.addEventListener('click', () => {
  currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
  updateLightboxImage();
});
if (el.viewerNext) el.viewerNext.addEventListener('click', () => {
  currentImageIndex = (currentImageIndex + 1) % currentImages.length;
  updateLightboxImage();
});

/* ---------- Navigation (Page Toggle) ---------- */
function showPage(page) {
  if (page === 'chart') {
    if (el.pageList) el.pageList.style.display = 'none';
    if (el.pageChart) el.pageChart.style.display = 'block';
    
    if (el.navBtnHome) el.navBtnHome.classList.remove('active');
    if (el.mobileChartBtn) el.mobileChartBtn.classList.add('active');
    if (el.navDesktopHome) el.navDesktopHome.classList.remove('active');
    if (el.navDesktopChart) el.navDesktopChart.classList.add('active');
    
    updateCharts();
  } else {
    if (el.pageChart) el.pageChart.style.display = 'none';
    if (el.pageList) el.pageList.style.display = 'block';
    
    if (el.mobileChartBtn) el.mobileChartBtn.classList.remove('active');
    if (el.navBtnHome) el.navBtnHome.classList.add('active');
    if (el.navDesktopChart) el.navDesktopChart.classList.remove('active');
    if (el.navDesktopHome) el.navDesktopHome.classList.add('active');
  }
}

/* ---------- Event Listeners ---------- */
function handleSearch(val) {
  searchQuery = val;
  if (el.clearSearch) el.clearSearch.style.display = searchQuery ? 'grid' : 'none';
  applyFilters();
}
if (el.searchInput) el.searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
if (el.searchInputMobile) el.searchInputMobile.addEventListener('input', (e) => handleSearch(e.target.value));
if (el.clearSearch) {
  el.clearSearch.addEventListener('click', () => {
    if (el.searchInput) el.searchInput.value = '';
    if (el.searchInputMobile) el.searchInputMobile.value = '';
    handleSearch('');
  });
}

function onFilterDesktopChange() {
  activeKategori = el.filterKategori.value;
  activeDesa = el.filterDesa.value;
  activeSaluran = el.filterSaluran.value;
  if (el.filterKategoriMobile) el.filterKategoriMobile.value = activeKategori;
  if (el.filterDesaMobile) el.filterDesaMobile.value = activeDesa;
  if (el.filterSaluranMobile) el.filterSaluranMobile.value = activeSaluran;
  applyFilters();
}
if (el.filterKategori) el.filterKategori.addEventListener('change', onFilterDesktopChange);
if (el.filterDesa) el.filterDesa.addEventListener('change', onFilterDesktopChange);
if (el.filterSaluran) el.filterSaluran.addEventListener('change', onFilterDesktopChange);

function onFilterMobileChange() {
  activeKategori = el.filterKategoriMobile.value;
  activeDesa = el.filterDesaMobile.value;
  activeSaluran = el.filterSaluranMobile.value;
  if (el.filterKategori) el.filterKategori.value = activeKategori;
  if (el.filterDesa) el.filterDesa.value = activeDesa;
  if (el.filterSaluran) el.filterSaluran.value = activeSaluran;
  applyFilters();
}
if (el.filterKategoriMobile) el.filterKategoriMobile.addEventListener('change', onFilterMobileChange);
if (el.filterDesaMobile) el.filterDesaMobile.addEventListener('change', onFilterMobileChange);
if (el.filterSaluranMobile) el.filterSaluranMobile.addEventListener('change', onFilterMobileChange);

let lastScrollTop = 0;
window.addEventListener('scroll', () => {
  if (window.innerWidth > 900) return;
  let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  if (scrollTop > lastScrollTop && scrollTop > 50) el.bottomNav.classList.add('hidden');
  else el.bottomNav.classList.remove('hidden');
  lastScrollTop = scrollTop;
});

if (el.modalClose) el.modalClose.addEventListener('click', closeModal);
if (el.modalOverlay) el.modalOverlay.addEventListener('click', (e) => { if (e.target === el.modalOverlay) closeModal(); });
if (el.viewerClose) el.viewerClose.addEventListener('click', closeViewer);
if (el.imageViewer) el.imageViewer.addEventListener('click', (e) => { if (e.target === el.imageViewer) closeViewer(); });

if (el.loadMoreBtn) el.loadMoreBtn.addEventListener('click', loadMoreData);
if (el.refreshBtnMobile) el.refreshBtnMobile.addEventListener('click', loadData);

if (el.mobileSearchBtn) {
  el.mobileSearchBtn.addEventListener('click', () => {
    showPage('list');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => { if (el.searchInputMobile) el.searchInputMobile.focus(); }, 300);
  });
}
if (el.navBtnHome) el.navBtnHome.addEventListener('click', () => showPage('list'));
if (el.mobileChartBtn) el.mobileChartBtn.addEventListener('click', () => showPage('chart'));
if (el.navDesktopHome) el.navDesktopHome.addEventListener('click', () => showPage('list'));
if (el.navDesktopChart) el.navDesktopChart.addEventListener('click', () => showPage('chart'));

function openFilterOverlay() { if (el.filterOverlay) el.filterOverlay.classList.add('active'); }
function closeFilterOverlay() { if (el.filterOverlay) el.filterOverlay.classList.remove('active'); }
if (el.openFilterBtn) el.openFilterBtn.addEventListener('click', openFilterOverlay);
if (el.mobileFilterBtn) el.mobileFilterBtn.addEventListener('click', openFilterOverlay);
if (el.closeFilterBtn) el.closeFilterBtn.addEventListener('click', closeFilterOverlay);
if (el.applyFilterBtn) el.applyFilterBtn.addEventListener('click', closeFilterOverlay);
if (el.filterOverlay) el.filterOverlay.addEventListener('click', (e) => { if (e.target === el.filterOverlay) closeFilterOverlay(); });

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  const splash = document.getElementById('splashScreen');
  if (splash) {
    setTimeout(() => {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 800);
    }, 2200);
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(reg => console.log('SW registered')).catch(err => console.log('SW failed:', err));
    });
  }
});