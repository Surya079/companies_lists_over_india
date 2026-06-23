const data = [];
const companyList = document.getElementById("companyList");
const statusMessage = document.getElementById("statusMessage");
const currentPageEl = document.getElementById("currentPage");
const totalPagesEl = document.getElementById("totalPages");
const totalCountEl = document.getElementById("totalCount");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageSizeSelect = document.getElementById("pageSize");
const searchInput = document.getElementById("searchInput");

const STATUS_STORAGE_KEY = "company-status-map";

let currentPage = 1;
let pageSize = Number(pageSizeSelect.value);
let filteredData = [...data];

function getCompanyKey(item) {
  return [item.title, item.city || "", item.website || ""].join("::");
}

function loadStatusMap() {
  try {
    return JSON.parse(localStorage.getItem(STATUS_STORAGE_KEY) || "{}") || {};
  } catch (error) {
    return {};
  }
}

function saveStatusMap(map) {
  localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(map));
}

async function loadCompanies() {
  try {
    const response = await fetch("companies.json");
    if (!response.ok) {
      throw new Error(`Unable to fetch companies.json (${response.status})`);
    }
    const json = await response.json();
    if (!Array.isArray(json)) {
      throw new Error(
        "companies.json must contain an array of company objects.",
      );
    }
    const statusMap = loadStatusMap();
    data.push(...json);
    data.forEach((item, index) => {
      item.__id = index;
      const key = getCompanyKey(item);
      if (statusMap[key]) {
        item.status = statusMap[key];
      } else if (!item.status) {
        item.status = "Pending";
      }
    });
    filteredData = [...data];
    statusMessage.textContent = "";
    renderCards(currentPage);
  } catch (error) {
    statusMessage.textContent =
      "Unable to load companies. Serve this folder from a local web server or check companies.json.";
    companyList.innerHTML = "";
    currentPageEl.textContent = "0";
    totalPagesEl.textContent = "0";
    totalCountEl.textContent = "0";
    prevPageBtn.disabled = true;
    nextPageBtn.disabled = true;
    console.error(error);
  }
}

function getStatusClass(status) {
  if (status === "Applied") return "applied";
  if (status === "Pending") return "pending";
  if (status === "Offered") return "offered";
  if (status === "Rejected") return "rejected";
  return "unknown";
}

function updateStatus(id, status) {
  const item = data.find((company) => company.__id === id);
  if (item) {
    item.status = status;
    const statusMap = loadStatusMap();
    statusMap[getCompanyKey(item)] = status;
    saveStatusMap(statusMap);
    renderCards(currentPage);
  }
}
window.updateStatus = updateStatus;

function renderCards(page = 1) {
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  currentPage = Math.min(Math.max(page, 1), totalPages);

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = filteredData.slice(start, end);

  if (!pageItems.length) {
    companyList.innerHTML =
      '<div class="empty-state">No matching companies found.</div>';
  } else {
    companyList.innerHTML = pageItems
      .map(
        (item) => `
    <article class="company-card">
      <header>
        <div class="company-info">
          <h2 class="company-name">${item.title}</h2>
          <div class="company-meta">
            <span class="badge">${item.categoryName || item.categories?.[0] || "Company"}</span>
            <select class="status-select ${getStatusClass(item.status)}" onchange="updateStatus(${item.__id}, this.value)">
              <option value="Applied" ${item.status === "Applied" ? "selected" : ""}>Applied</option>
              <option value="Pending" ${item.status === "Pending" ? "selected" : ""}>Pending</option>
              <option value="Offered" ${item.status === "Offered" ? "selected" : ""}>Offered</option>
              <option value="Rejected" ${item.status === "Rejected" ? "selected" : ""}>Rejected</option>
            </select>
          </div>
        </div>
        <div class="company-meta">
          <span class="badge">${item.totalScore || "N/A"} ★</span>
          <span class="badge">${item.reviewsCount || 0} reviews</span>
        </div>
      </header>
      <ul class="contact-list">
        <li><span>Location</span><span>${item.city || "Unknown"}, ${item.state || "Unknown"}</span></li>
        <li><span>Category</span><span>${(item.categories || [item.categoryName || "N/A"]).join(", ")}</span></li>
        <li><span>Phone</span><span>${item.phone || "N/A"}</span></li>
      </ul>
      <div class="company-description">
        <p>${item.street || "Address not available"}</p>
        <p><a href="${item.website || "#"}" target="_blank" rel="noreferrer noopener">Visit website</a></p>
        <p><a href="${item.url || "#"}" target="_blank" rel="noreferrer noopener">View on map</a></p>
      </div>
    </article>
  `,
      )
      .join("");
  }

  currentPageEl.textContent = currentPage;
  totalPagesEl.textContent = totalPages;
  totalCountEl.textContent = filteredData.length.toLocaleString();
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

function updateFilter() {
  const searchValue = searchInput.value.trim().toLowerCase();
  filteredData = data.filter((item) => {
    return (
      item.city?.toLowerCase().includes(searchValue) ||
      item.state?.toLowerCase().includes(searchValue)
    );
  });
  currentPage = 1;
  renderCards(currentPage);
}

pageSizeSelect.addEventListener("change", (event) => {
  pageSize = Number(event.target.value);
  currentPage = 1;
  renderCards(currentPage);
});

searchInput.addEventListener("input", () => {
  updateFilter();
});

prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    renderCards(currentPage);
  }
});

nextPageBtn.addEventListener("click", () => {
  const maxPage = Math.ceil(filteredData.length / pageSize);
  if (currentPage < maxPage) {
    currentPage += 1;
    renderCards(currentPage);
  }
});

loadCompanies();
