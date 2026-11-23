const elMsg = document.getElementById('coord-msg');
const elLoginCard = document.getElementById('coord-login-card');
const elAvisoPapel = document.getElementById('coord-aviso-papel');
const elPainel = document.getElementById('coord-painel');
const elNavUsuario = document.getElementById('coord-nav-usuario');
const elBtnSair = document.getElementById('btn-coord-sair');
const selectAtividade = document.getElementById('select-atividade');
const inputBusca = document.getElementById('input-busca-inscrito');
const tbody = document.getElementById('tabela-inscritos');
const resumoPresenca = document.getElementById('resumo-presenca');
const listaCoordAtividades = document.getElementById('lista-coord-atividades');

let atividades = [];

function mostrarMsg(texto, tipo = 'ok') {
  elMsg.textContent = texto;
  elMsg.className = `alerta ${tipo === 'erro' ? 'alerta-erro' : 'alerta-ok'}`;
}

async function api(url, opcoes = {}) {
  const resp = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(opcoes.headers || {}) },
    ...opcoes,
  });
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(dados?.erro?.mensagem || `Erro HTTP ${resp.status}`);
  }
  return dados;
}

async function verificarSessao() {
  elAvisoPapel.classList.add('oculto');
  try {
    const { usuario } = await api('/api/auth/me');
    elNavUsuario.textContent = `${usuario.nome} (${usuario.papel})`;
    elBtnSair.classList.remove('oculto');

    if (usuario.papel !== 'coordenacao') {
      elPainel.classList.add('oculto');
      elLoginCard.classList.remove('oculto');
      elAvisoPapel.textContent =
        'Você está conectado como participante. Entre com uma conta de coordenação para gerenciar atividades e presenças.';
      elAvisoPapel.classList.remove('oculto');
      return false;
    }

    elLoginCard.classList.add('oculto');
    elPainel.classList.remove('oculto');
    return true;
  } catch {
    elNavUsuario.textContent = '';
    elBtnSair.classList.add('oculto');
    elPainel.classList.add('oculto');
    elLoginCard.classList.remove('oculto');
    return false;
  }
}

async function carregarAtividades() {
  const dados = await api('/api/atividades');
  atividades = dados.atividades;

  renderizarListaAtividades();

  const selecionadaAntes = selectAtividade.value;
  selectAtividade.replaceChildren();

  if (atividades.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Nenhuma atividade cadastrada';
    selectAtividade.appendChild(opt);
    tbody.replaceChildren();
    resumoPresenca.textContent = '';
    return;
  }

  for (const a of atividades) {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = `${a.titulo} (${a.vagasOcupadas}/${a.vagas} inscritos)`;
    selectAtividade.appendChild(opt);
  }

  if (selecionadaAntes && atividades.some((a) => a.id === selecionadaAntes)) {
    selectAtividade.value = selecionadaAntes;
  }
  await carregarInscritos();
}

function formatarPeriodo(inicioIso, fimIso) {
  const fmt = (iso) =>
    new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  return `${fmt(inicioIso)} até ${fmt(fimIso)}`;
}

function renderizarListaAtividades() {
  listaCoordAtividades.replaceChildren();
  if (atividades.length === 0) {
    const p = document.createElement('p');
    p.className = 'meta';
    p.textContent = 'Nenhuma atividade cadastrada.';
    listaCoordAtividades.appendChild(p);
    return;
  }

  for (const a of atividades) {
    const item = document.createElement('div');
    item.className = 'atividade-item';

    const info = document.createElement('div');
    info.className = 'atividade-info';

    const h3 = document.createElement('h3');
    h3.textContent = a.titulo;
    const pHorario = document.createElement('p');
    pHorario.className = 'meta';
    pHorario.textContent = `${formatarPeriodo(a.inicio, a.fim)} • ${a.vagasOcupadas}/${a.vagas} inscritos`;
    info.append(h3, pHorario);

    const acoes = document.createElement('div');
    acoes.className = 'acoes';

    const btnExcluir = document.createElement('button');
    btnExcluir.type = 'button';
    btnExcluir.className = 'btn-perigo';
    btnExcluir.textContent = 'Excluir atividade';
    btnExcluir.addEventListener('click', () => void excluirAtividade(a.id, a.titulo));
    acoes.appendChild(btnExcluir);

    item.append(info, acoes);
    listaCoordAtividades.appendChild(item);
  }
}

async function excluirAtividade(atividadeId, titulo) {
  if (!window.confirm(`Deseja realmente excluir a atividade "${titulo}"?`)) {
    return;
  }
  try {
    const dados = await api(`/api/coordenacao/atividades/${encodeURIComponent(atividadeId)}`, {
      method: 'DELETE',
    });
    mostrarMsg(dados.mensagem || 'Atividade excluída com sucesso.');
    await carregarAtividades();
  } catch (erro) {
    mostrarMsg(erro.message, 'erro');
  }
}

async function carregarInscritos() {
  const atividadeId = selectAtividade.value;
  tbody.replaceChildren();
  resumoPresenca.textContent = '';
  if (!atividadeId) return;

  const busca = inputBusca.value.trim();
  const qs = busca ? `?busca=${encodeURIComponent(busca)}` : '';
  const { inscritos } = await api(
    `/api/coordenacao/atividades/${encodeURIComponent(atividadeId)}/inscritos${qs}`,
  );

  const presentes = inscritos.filter((i) => i.presente).length;
  resumoPresenca.textContent = `Total listado: ${inscritos.length} • Presentes confirmados: ${presentes}`;

  if (inscritos.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.className = 'meta';
    td.textContent = 'Nenhum inscrito ativo encontrado para esta atividade.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const item of inscritos) {
    const tr = document.createElement('tr');

    const tdNome = document.createElement('td');
    tdNome.textContent = item.nome;

    const tdEmail = document.createElement('td');
    tdEmail.textContent = item.email;

    const tdPresenca = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge ${item.presente ? 'badge-ok' : 'badge-aviso'}`;
    badge.textContent = item.presente ? 'Presente' : 'Ausente';
    tdPresenca.appendChild(badge);

    const tdAcao = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = item.presente ? 'btn-secundario' : 'btn-sucesso';
    btn.textContent = item.presente ? 'Remover presença' : 'Confirmar presença';
    btn.addEventListener('click', () => void alternarPresenca(item.inscricaoId, !item.presente));
    tdAcao.appendChild(btn);

    tr.append(tdNome, tdEmail, tdPresenca, tdAcao);
    tbody.appendChild(tr);
  }
}

async function alternarPresenca(inscricaoId, presente) {
  try {
    await api(`/api/coordenacao/inscricoes/${encodeURIComponent(inscricaoId)}/presenca`, {
      method: 'PATCH',
      body: JSON.stringify({ presente }),
    });
    await carregarInscritos();
  } catch (erro) {
    mostrarMsg(erro.message, 'erro');
  }
}

async function inicializar() {
  const ok = await verificarSessao();
  if (ok) {
    await carregarAtividades();
  }
}

document.getElementById('form-coord-login').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.currentTarget);
  try {
    await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        cpf: String(fd.get('cpf') || ''),
        senha: String(fd.get('senha') || ''),
      }),
    });
    ev.currentTarget.reset();
    mostrarMsg('Login realizado.');
    await inicializar();
  } catch (erro) {
    mostrarMsg(erro.message, 'erro');
  }
});

document.getElementById('form-nova-atividade').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.currentTarget);
  try {
    await api('/api/coordenacao/atividades', {
      method: 'POST',
      body: JSON.stringify({
        titulo: String(fd.get('titulo') || ''),
        descricao: String(fd.get('descricao') || '') || null,
        inicio: new Date(String(fd.get('inicio'))).toISOString(),
        fim: new Date(String(fd.get('fim'))).toISOString(),
        cargaHorariaMinutos: Number(fd.get('cargaHorariaMinutos')),
        vagas: Number(fd.get('vagas')),
      }),
    });
    ev.currentTarget.reset();
    mostrarMsg('Atividade cadastrada com sucesso.');
    await carregarAtividades();
  } catch (erro) {
    mostrarMsg(erro.message, 'erro');
  }
});

selectAtividade.addEventListener('change', () => void carregarInscritos());
inputBusca.addEventListener('input', () => void carregarInscritos());

elBtnSair.addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST', body: '{}' }).catch(() => undefined);
  mostrarMsg('Sessão encerrada.');
  await inicializar();
});

void inicializar();
