import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import {
  bankCore,
  bankInitials,
  bankMark,
  indexInstitutions,
  resolveBankDomain,
} from '../src/bank-logo.js';

test('legal suffixes and division text leave the brand core', () => {
  assert.equal(bankCore('Wells Fargo Bank National Association'), 'WELLS FARGO BANK');
  assert.equal(bankCore('Wells Fargo Bank, National Association'), 'WELLS FARGO BANK');
  assert.equal(bankCore('Zions Bank, A Division of'), 'ZIONS BANK');
  assert.equal(bankCore('The Huntington National Bank'), 'HUNTINGTON NATIONAL BANK');
  assert.equal(bankCore('U.S. Bank, National Association'), 'U S BANK');
  assert.equal(bankCore('Live Oak Banking Company'), 'LIVE OAK BANKING');
});

test('a logo is assigned only when one institution owns the name', () => {
  const citizens = indexInstitutions([
    { NAME: 'Citizens Bank', WEBADDR: 'www.citizensbankwi.bank' },
    { NAME: 'Citizens Bank, National Association', WEBADDR: 'www.citizensbank.com' },
  ]);
  assert.equal(resolveBankDomain('Citizens Bank', citizens), '');
  const wells = indexInstitutions([
    { NAME: 'Wells Fargo Bank, National Association', WEBADDR: 'www.wellsfargo.com' },
  ]);
  assert.equal(resolveBankDomain('Wells Fargo Bank National Association', wells), 'wellsfargo.com');
  const parent = indexInstitutions([
    { NAME: 'SmartBiz Bank, National Association', WEBADDR: 'www.smartbizbank.com' },
  ]);
  assert.equal(
    resolveBankDomain('CenTrust Bank, A Division of SmartBiz Bank National Association', parent, {}, []),
    'smartbizbank.com',
  );
});

test('hand-checked brands keep their public site', () => {
  assert.equal(resolveBankDomain('Zions Bank, A Division of', new Map()), 'zionsbank.com');
  assert.equal(resolveBankDomain('America First Federal Credit Union', new Map()), 'americafirst.com');
  assert.equal(resolveBankDomain('JPMorgan Chase Bank, National Association', new Map()), 'chase.com');
  assert.equal(resolveBankDomain('Northeast Bank', new Map()), 'northeastbank.com');
  assert.equal(resolveBankDomain('CDC Small Business Finance Corp.', new Map()), '');
  assert.equal(resolveBankDomain('Community Banks of Colorado, A Division of NBH Bank', new Map()), '');
});

test('published logos exist for the main Clark County lenders', () => {
  const logos = JSON.parse(readFileSync(new URL('../data/bank-logos.json', import.meta.url), 'utf8'));
  for (const name of [
    'Live Oak Banking Company',
    'Wells Fargo Bank National Association',
    'The Huntington National Bank',
    'U.S. Bank, National Association',
    'Zions Bank, A Division of',
    'America First Federal Credit Union',
  ]) {
    assert.equal(typeof logos[name], 'string', name);
    assert.equal(existsSync(new URL(`../${logos[name]}`, import.meta.url)), true, logos[name]);
  }
  assert.equal(logos['Citizens Bank'], undefined);
  assert.equal(logos['CDC Small Business Finance Corp.'], undefined);
  assert.equal(logos['Columbia Bank'], undefined);
});

test('a lender mark escapes the name and uses initials when no logo is verified', () => {
  const html = bankMark('Wells Fargo Bank National Association', {
    'Wells Fargo Bank National Association': 'data/logos/wellsfargo-com.png',
  });
  assert.match(html, /class="bank-mark"/);
  assert.match(html, /src="data\/logos\/wellsfargo-com\.png"/);
  assert.match(html, /Wells Fargo Bank National Association/);
  const plain = bankMark('Citizens <Bank>', {});
  assert.match(plain, /Citizens &lt;Bank&gt;/);
  assert.match(plain, /class="bank-mark bank-initials"/);
  assert.equal(plain.includes('<Bank>'), false);
  assert.equal(bankInitials('Bank of America, National Association'), 'BA');
  assert.equal(bankInitials('U.S. Bank, National Association'), 'US');
  assert.equal(bankInitials('CDC Small Business Finance Corp.'), 'CDC');
  assert.equal(bankInitials('TD Bank, National Association'), 'TD');
});

test('the page draws a logo beside lender names', () => {
  const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(page, /bankMark\(row\.bank, bankLogos\)/);
  assert.equal(page.split('html: (value) => bankMark(value, bankLogos)').length - 1, 3);
  assert.match(page, /\.bank-mark \{/);
  assert.match(page, /data\/bank-logos\.json/);
});
