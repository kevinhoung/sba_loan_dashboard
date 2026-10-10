// Local tables for the dashboard.
// Grid.js 6 draws "An error happened while fetching the data" when its
// pagination step runs before the in-memory rows are ready. These tables
// never fetch; search, sort, and pages all run on the rows passed in.

const ARROWS = '<span class="col-arrows" aria-hidden="true"><svg viewBox="0 0 10 14" width="10" height="14"><path class="arrow-up" d="M5 0.8 L8.7 5.4 H1.3 Z"/><path class="arrow-down" d="M5 13.2 L1.3 8.6 H8.7 Z"/></svg></span>';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

export function sortValue(column, row) {
  const value = row[column.index];
  if (typeof column.sort === 'function') return column.sort(value, row);
  if (column.numeric) {
    if (value == null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  if (value == null) return null;
  return String(value);
}

export function searchText(column, row) {
  const value = row[column.index];
  if (typeof column.search === 'function') return String(column.search(value, row) ?? '');
  if (value == null) return '';
  return String(value);
}

function compareValues(left, right) {
  const leftMissing = left == null || left === '';
  const rightMissing = right == null || right === '';
  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
}

export function tableView(rows, columns, state) {
  const query = String(state.query || '').trim().toLowerCase();
  const matched = query
    ? rows.filter((row) => columns.some((column) => searchText(column, row).toLowerCase().includes(query)))
    : rows.slice();
  const indexed = matched.map((row, index) => ({ row, index }));
  if (state.sortIndex != null) {
    const column = columns[state.sortIndex];
    const dir = state.sortDir === -1 ? -1 : 1;
    indexed.sort((a, b) => {
      const left = sortValue(column, a.row);
      const right = sortValue(column, b.row);
      const leftMissing = left == null || left === '';
      const rightMissing = right == null || right === '';
      if (leftMissing || rightMissing) {
        if (leftMissing && rightMissing) return a.index - b.index;
        return leftMissing ? 1 : -1;
      }
      return compareValues(left, right) * dir || a.index - b.index;
    });
  }
  const pageSize = state.pageSize > 0 ? state.pageSize : 10;
  const pages = Math.max(1, Math.ceil(indexed.length / pageSize));
  const page = Math.min(Math.max(state.page || 0, 0), pages - 1);
  const start = page * pageSize;
  return {
    rows: indexed.slice(start, start + pageSize).map((item) => item.row),
    total: indexed.length,
    page,
    pages,
    pageSize,
  };
}

export function pageButtons(page, pages, count = 3) {
  if (count <= 0 || pages <= 0) return [];
  const shown = Math.min(pages, count);
  let pivot = Math.min(page, Math.floor(shown / 2));
  if (page + Math.floor(shown / 2) >= pages) pivot = shown - (pages - page);
  const items = [];
  if (pages > shown && page - pivot > 0) {
    items.push({ type: 'page', page: 0 });
    items.push({ type: 'spread' });
  }
  for (let offset = 0; offset < shown; offset += 1) {
    items.push({ type: 'page', page: page + (offset - pivot), current: page + (offset - pivot) === page });
  }
  if (pages > shown && pages > page + pivot + 1) {
    items.push({ type: 'spread' });
    items.push({ type: 'page', page: pages - 1 });
  }
  return items;
}

function cellHtml(column, row) {
  const value = row[column.index];
  if (typeof column.html === 'function') return column.html(value, row);
  const text = typeof column.format === 'function' ? column.format(value, row) : value ?? '';
  return escapeHtml(text);
}

function headerHtml(column) {
  return column.headerHtml || escapeHtml(column.name);
}

function summaryHtml(view) {
  if (!view.total) return '';
  const from = view.page * view.pageSize + 1;
  const to = Math.min(view.total, (view.page + 1) * view.pageSize);
  return `<div role="status" aria-live="polite" class="gridjs-summary" title="Page ${view.page + 1} of ${view.pages}">Showing <b>${from}</b> to <b>${to}</b> of <b>${view.total}</b> results</div>`;
}

function paginationHtml(view) {
  const prevDisabled = view.page === 0 ? ' disabled' : '';
  const nextDisabled = view.page + 1 >= view.pages ? ' disabled' : '';
  const buttons = pageButtons(view.page, view.pages).map((item) => {
    if (item.type === 'spread') return '<button type="button" tabindex="-1" class="gridjs-spread">...</button>';
    const current = item.page === view.page ? ' gridjs-currentPage' : '';
    return `<button type="button" class="${current.trim()}" data-page="${item.page}" title="Page ${item.page + 1}" aria-label="Page ${item.page + 1}">${item.page + 1}</button>`;
  }).join('');
  return `<div class="gridjs-pagination">${summaryHtml(view)}<div class="gridjs-pages"><button type="button" data-page="${view.page - 1}"${prevDisabled} title="Previous" aria-label="Previous">Previous</button>${buttons}<button type="button" data-page="${view.page + 1}"${nextDisabled} title="Next" aria-label="Next">Next</button></div></div>`;
}

export function renderDataTable(container, options) {
  const columns = options.columns;
  const rows = options.rows || [];
  const state = { query: '', sortIndex: null, sortDir: 1, page: 0, pageSize: options.pageSize || 10 };
  container.replaceChildren();
  const root = document.createElement('div');
  root.className = 'gridjs-container';
  if (options.search) {
    const search = document.createElement('div');
    search.className = 'gridjs-search';
    const input = document.createElement('input');
    input.className = 'gridjs-input';
    input.type = 'search';
    input.placeholder = 'Type a keyword...';
    input.setAttribute('aria-label', 'Type a keyword');
    input.addEventListener('input', () => {
      state.query = input.value;
      state.page = 0;
      draw();
    });
    search.appendChild(input);
    root.appendChild(search);
  }
  const wrapper = document.createElement('div');
  wrapper.className = 'gridjs-wrapper';
  const footer = document.createElement('div');
  footer.className = 'gridjs-footer';
  root.append(wrapper, footer);
  container.appendChild(root);

  function draw() {
    const view = tableView(rows, columns, state);
    state.page = view.page;
    const heads = columns.map((column, index) => {
      const align = column.align === 'end' ? ' data-align="end"' : '';
      const sorted = state.sortIndex === index;
      const aria = sorted ? (state.sortDir === 1 ? 'ascending' : 'descending') : 'none';
      return `<th class="gridjs-th gridjs-th-sort" scope="col" data-index="${index}"${align}><span class="gridjs-th-content">${headerHtml(column)}</span><button type="button" class="gridjs-sort" aria-sort="${aria}" aria-label="Sort ${escapeHtml(column.name)}">${ARROWS}</button></th>`;
    }).join('');
    const body = view.rows.length
      ? view.rows.map((row) => `<tr class="gridjs-tr">${columns.map((column) => {
        const align = column.align === 'end' ? ' data-align="end"' : '';
        return `<td class="gridjs-td"${align}>${cellHtml(column, row)}</td>`;
      }).join('')}</tr>`).join('')
      : `<tr class="gridjs-tr"><td class="gridjs-td gridjs-message" colspan="${columns.length}">No matching records found</td></tr>`;
    wrapper.innerHTML = `<table role="grid" class="gridjs-table"><thead class="gridjs-thead"><tr class="gridjs-tr">${heads}</tr></thead><tbody class="gridjs-tbody">${body}</tbody></table>`;
    footer.innerHTML = paginationHtml(view);
  }

  root.addEventListener('click', (event) => {
    const pageButton = event.target.closest('button[data-page]');
    if (pageButton && root.contains(pageButton) && !pageButton.disabled) {
      state.page = Number(pageButton.dataset.page);
      draw();
      return;
    }
    const header = event.target.closest('th[data-index]');
    if (header && root.contains(header)) {
      const index = Number(header.dataset.index);
      if (state.sortIndex === index) state.sortDir = state.sortDir === 1 ? -1 : 1;
      else {
        state.sortIndex = index;
        state.sortDir = 1;
      }
      state.page = 0;
      draw();
    }
  });

  draw();
}
