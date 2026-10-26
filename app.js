'use strict';
const STORAGE_KEY = 'chagok-transactions-v1';
const $ = (selector) => document.querySelector(selector);
const categories = { expense: ['식비', '카페·간식', '교통', '쇼핑', '주거·통신', '건강', '문화·여가', '기타 지출'], income: ['급여', '용돈', '부수입', '기타 수입'] };
const icons = { '식비': '♨', '카페·간식': '☕', '교통': '↔', '쇼핑': '◇', '주거·통신': '⌂', '건강': '♡', '문화·여가': '♫' };
const money = (n) => n.toLocaleString('ko-KR');
function localDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
let transactions = [], filter = 'all', pendingDelete = null;
function validTransaction(t) { return t && typeof t.id === 'string' && ['income','expense'].includes(t.type) && Number.isSafeInteger(t.amount) && t.amount > 0 && t.amount <= 999999999999 && /^\d{4}-\d{2}-\d{2}$/.test(t.date) && categories[t.type].includes(t.category) && typeof t.memo === 'string'; }
try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); if (!Array.isArray(stored) || !stored.every(validTransaction)) throw new Error('Invalid data'); transactions = stored; } catch { $('#form-message').textContent = '저장된 내역을 불러오지 못했어요. 브라우저 저장 공간을 확인해 주세요.'; }
$('#date').value = localDate(); $('#month').value = localDate().slice(0,7);
function updateCategories() { const type = document.querySelector('[name=type]:checked').value; $('#category').replaceChildren(...categories[type].map(value => new Option(value,value))); $('#memo').placeholder = type === 'income' ? '어떤 수입이 들어왔나요?' : '어디에 사용하셨나요?'; }
function persist(next) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); transactions = next; return true; } catch { $('#form-message').textContent = '저장 공간에 접근할 수 없어요. 브라우저 설정을 확인해 주세요. 기록은 저장되지 않았어요.'; return false; } }
function render() {
 const month = $('#month').value;
 const items = transactions.filter(t => t.date.slice(0,7) === month);
 const income = items.filter(t=>t.type==='income').reduce((sum,t)=>sum+t.amount,0);
 const expense = items.filter(t=>t.type==='expense').reduce((sum,t)=>sum+t.amount,0);
 for (const [id,value] of [['income',income],['expense',expense],['balance',income-expense]]) { const target = $('#'+id); target.replaceChildren(document.createTextNode(money(value)),Object.assign(document.createElement('span'),{textContent:'원'})); }
 $('#count').textContent = items.length;
 const visible = items.filter(t=>filter==='all'||t.type===filter).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
 const container = $('#transactions'); container.replaceChildren();
 if (!visible.length) { const empty = document.createElement('div'); empty.className='empty'; empty.innerHTML='<div class="empty-icon" aria-hidden="true">▤</div><h3></h3><p></p>'; empty.querySelector('h3').textContent = items.length ? '해당하는 내역이 없어요' : '아직 기록된 내역이 없어요'; empty.querySelector('p').textContent = items.length ? '다른 필터를 선택해 내역을 확인해 보세요.' : '첫 번째 수입이나 지출을 기록해 보세요. 작은 시작이면 충분해요.'; container.append(empty); }
 for (const t of visible) {
  const row=document.createElement('article'); row.className='transaction '+t.type;
  const icon=Object.assign(document.createElement('span'),{className:'transaction-icon',textContent:t.type==='income'?'↙':icons[t.category]||'↗'}); icon.setAttribute('aria-hidden','true');
  const details=Object.assign(document.createElement('div'),{className:'transaction-details'});
  details.append(Object.assign(document.createElement('div'),{className:'transaction-title',textContent:t.memo||t.category}), Object.assign(document.createElement('div'),{className:'transaction-meta',textContent:`${t.date.slice(5).replace('-','.')} · ${t.category}`}));
  const amount=Object.assign(document.createElement('div'),{className:'transaction-amount',textContent:`${t.type==='income'?'+':'−'}${money(t.amount)}원`});
  const remove=Object.assign(document.createElement('button'),{className:'delete',textContent:'×'}); remove.setAttribute('aria-label',`${t.memo||t.category} ${money(t.amount)}원 기록 삭제`); remove.onclick=()=>{pendingDelete=t.id; $('#delete-dialog').showModal();};
  row.append(icon,details,amount,remove); container.append(row);
 }
}
document.querySelectorAll('[name=type]').forEach(el=>el.addEventListener('change',updateCategories));
$('#month').addEventListener('change',render);
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button); b.setAttribute('aria-pressed',String(b===button));});render();}));
$('#entry-form').addEventListener('submit',event=>{
 event.preventDefault();
 const amount=Number($('#amount').value), date=$('#date').value, type=document.querySelector('[name=type]:checked').value;
 if (!Number.isSafeInteger(amount)||amount<=0||amount>999999999999||!/^\d{4}-\d{2}-\d{2}$/.test(date)) { $('#form-message').textContent='금액은 1원 이상 정수로, 날짜는 올바르게 입력해 주세요.'; return; }
 const transaction={id:Date.now().toString(36)+'-'+crypto.randomUUID(),type,amount,date,category:$('#category').value,memo:$('#memo').value.trim()};
 if (!persist([...transactions,transaction])) return;
 $('#month').value=date.slice(0,7); $('#amount').value=''; $('#memo').value=''; filter='all'; document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter==='all');b.setAttribute('aria-pressed',String(b.dataset.filter==='all'));});
 render(); $('#form-message').textContent='기록을 저장했어요.'; $('#amount').focus();
});
$('#cancel-delete').onclick=()=>$('#delete-dialog').close();
$('#confirm-delete').onclick=()=>{if (pendingDelete && persist(transactions.filter(t=>t.id!==pendingDelete))) {render();$('#form-message').textContent='기록을 삭제했어요.';} $('#delete-dialog').close();pendingDelete=null;};
updateCategories(); render();
