// DomTicket client-side app logic (auth + ticket CRUD using localStorage)
(function(){
  const SESSION_KEY = 'ticketapp_session';
  const USERS_KEY = 'ticketapp_users';
  const TICKETS_KEY = 'ticketapp_tickets';

  function $(sel, root=document) { return root.querySelector(sel); }
  function $all(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }

  // Toast
  const toastEl = document.getElementById('toast');
  function showToast(message, timeout=3000){
    if(!toastEl) return;
    toastEl.textContent = message;
    toastEl.hidden = false;
    setTimeout(()=> toastEl.hidden = true, timeout);
  }

  function setSession(session){
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    updateAuthUI();
  }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); updateAuthUI(); }
  function getSession(){ try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch(e){return null} }

  function updateAuthUI(){
    const logoutBtn = document.getElementById('logoutBtn');
    const session = getSession();
    if(logoutBtn){
      if(session){ logoutBtn.hidden = false; logoutBtn.addEventListener('click', ()=>{ clearSession(); window.location.href = '/?p=landing'; }); }
      else logoutBtn.hidden = true;
    }
  }

  // Protect routes: /?p=dashboard and /?p=tickets must have session
  function protectRoute(){
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p') || 'landing';
    const protectedPages = ['dashboard','tickets'];
    if(protectedPages.includes(p)){
      const s = getSession();
      if(!s){
        showToast('Your session has expired — please log in again.');
        window.location.href = '/?p=auth/login';
      }
    }
  }

  // Simple user store
  function getUsers(){ try{ return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }catch(e){return []} }
  function saveUser(user){ const u = getUsers(); u.push(user); localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

  // Tickets store
  function getTickets(){ try{ return JSON.parse(localStorage.getItem(TICKETS_KEY)) || []; }catch(e){return []} }
  function saveTickets(list){ localStorage.setItem(TICKETS_KEY, JSON.stringify(list)); }

  // Auth forms
  function initSignup(){
    const form = document.getElementById('signupForm'); if(!form) return;
    form.addEventListener('submit', (e)=>{
      e.preventDefault(); clearFieldErrors(form);
      const username = form.username.value.trim();
      const password = form.password.value;
      let ok = true;
      if(!username){ setFieldError(form,'username','Please enter a username or email.'); ok=false; }
      if(!password || password.length<6){ setFieldError(form,'password','Password must be at least 6 characters.'); ok=false; }
      if(!ok) return;
      const users = getUsers();
      if(users.find(u=>u.username===username)){ showToast('A user with that name already exists.'); return; }
      saveUser({username,password});
      showToast('Account created. You can now log in.');
      window.location.href = '/?p=auth/login';
    });
  }

  function initLogin(){
    const form = document.getElementById('loginForm'); if(!form) return;
    form.addEventListener('submit', (e)=>{
      e.preventDefault(); clearFieldErrors(form);
      const username = form.username.value.trim();
      const password = form.password.value;
      let ok=true;
      if(!username){ setFieldError(form,'username','Please enter your username or email.'); ok=false; }
      if(!password){ setFieldError(form,'password','Please enter your password.'); ok=false; }
      if(!ok) return;
      const users = getUsers();
      const user = users.find(u=>u.username===username && u.password===password);
      if(!user){ showToast('Invalid credentials.'); return; }
      // create simple token
      setSession({username: user.username, token: btoa(user.username+':'+Date.now()), created: Date.now()});
      showToast('Login successful');
      window.location.href = '/?p=dashboard';
    });
  }

  // Field error helpers
  function clearFieldErrors(form){ $all('.field-error', form).forEach(el=>el.textContent=''); }
  function setFieldError(form, name, message){ const el = form.querySelector('.field-error[data-for="'+name+'"]'); if(el) el.textContent = message; }

  // Tickets UI
  function renderTickets(){
    const list = getTickets();
    const container = document.getElementById('ticketsList'); if(!container) return;
    container.innerHTML = '';
    if(list.length===0){ container.innerHTML = '<div class="card">No tickets yet. Create one.</div>'; return; }
    list.forEach(ticket=>{
      const card = document.createElement('div'); card.className='card ticket-card';
      const title = document.createElement('h4'); title.textContent = ticket.title; card.appendChild(title);
      const status = document.createElement('span'); status.textContent = ticket.status.replace('_',' ');
      status.className = 'status-tag status-' + ticket.status; card.appendChild(status);
      const desc = document.createElement('p'); desc.textContent = ticket.description || ''; card.appendChild(desc);
      const meta = document.createElement('div'); meta.className='meta'; meta.textContent = 'Priority: ' + (ticket.priority||'medium'); card.appendChild(meta);
      const actions = document.createElement('div'); actions.className='ticket-actions';
      const edit = document.createElement('button'); edit.className='btn'; edit.textContent='Edit'; edit.addEventListener('click', ()=> openTicketForm(ticket.id));
      const del = document.createElement('button'); del.className='btn btn-ghost'; del.textContent='Delete'; del.addEventListener('click', ()=> deleteTicket(ticket.id));
      actions.appendChild(edit); actions.appendChild(del); card.appendChild(actions);
      container.appendChild(card);
    });
  }

  function openTicketForm(id){
    const container = document.getElementById('ticketFormContainer'); const form = document.getElementById('ticketForm');
    document.getElementById('ticketFormTitle').textContent = id ? 'Edit Ticket' : 'Create Ticket';
    container.hidden = false;
    if(id){
      const t = getTickets().find(x=>x.id===id);
      if(!t){ showToast('Failed to load ticket.'); return; }
      form.title.value = t.title; form.description.value = t.description||''; form.status.value = t.status; form.priority.value = t.priority||'medium'; form.dataset.editId = id;
    } else {
      form.reset(); delete form.dataset.editId;
    }
  }

  function deleteTicket(id){
    if(!confirm('Delete this ticket?')) return;
    let list = getTickets();
    const before = list.length;
    list = list.filter(t=>t.id!==id);
    saveTickets(list);
    renderTickets();
    showToast('Ticket deleted');
  }

  function initTicketForm(){
    const newBtn = document.getElementById('newTicketBtn'); if(newBtn) newBtn.addEventListener('click', ()=> openTicketForm(null));
    const cancel = document.getElementById('cancelTicket'); if(cancel) cancel.addEventListener('click', ()=>{ document.getElementById('ticketFormContainer').hidden = true; });

    const form = document.getElementById('ticketForm'); if(!form) return;
    form.addEventListener('submit', (e)=>{
      e.preventDefault(); clearFieldErrors(form);
      const title = form.title.value.trim();
      const description = form.description.value.trim();
      const status = form.status.value;
      const priority = form.priority.value || 'medium';
      let ok=true;
      if(!title){ setFieldError(form,'title','Title is required.'); ok=false; }
      const allowed = ['open','in_progress','closed'];
      if(!allowed.includes(status)){ setFieldError(form,'status','Please choose a valid status (open, in_progress, closed).'); ok=false; }
      if(description && description.length>1000){ setFieldError(form,'description','Description is too long'); ok=false; }
      if(!ok) return;

      const editId = form.dataset.editId;
      const list = getTickets();
      if(editId){
        const item = list.find(t=>t.id===editId);
        if(!item){ showToast('Failed to update ticket.'); return; }
        item.title = title; item.description = description; item.status = status; item.priority = priority; item.updated_at = Date.now();
        saveTickets(list);
        showToast('Ticket updated');
      } else {
        const id = 't_'+Math.random().toString(36).slice(2,9);
        list.push({id,title,description,status,priority,created_at:Date.now()});
        saveTickets(list);
        showToast('Ticket created');
      }
      document.getElementById('ticketFormContainer').hidden = true;
      renderTickets();
    });
  }

  // Update dashboard stats
  function updateStats(){
    const list = getTickets();
    const total = list.length; const open = list.filter(t=>t.status==='open').length; const closed = list.filter(t=>t.status==='closed').length;
    const elTotal = document.getElementById('totalTickets'); if(elTotal) elTotal.textContent = total;
    const elOpen = document.getElementById('openTickets'); if(elOpen) elOpen.textContent = open;
    const elClosed = document.getElementById('resolvedTickets'); if(elClosed) elClosed.textContent = closed;
  }

  // Wire up on DOM ready
  document.addEventListener('DOMContentLoaded', ()=>{
    updateAuthUI(); protectRoute(); initSignup(); initLogin(); initTicketForm(); renderTickets(); updateStats();
  });

})();
