const estado = {
  usuario: null,
  atividades: [],
  minhasInscricoes: [],
};

const elMsg = document.getElementById('mensagem-global');
const elNavUsuario = document.getElementById('nav-usuario');
const elBtnSair = document.getElementById('btn-sair');
const elSecaoAcesso = document.getElementById('secao-acesso');
const elSecaoPerfil = document.getElementById('secao-perfil');
const elSecaoMinhas = document.getElementById('secao-minhas-inscricoes');
const elListaAtividades = document.getElementById('lista-atividades');
const elListaMinhas = document.getElementById('lista-minhas-inscricoes');
const elCaixaSandbox = document.getElementById('caixa-sandbox');

const formLogin = document.getElementById('form-login');
const formCadastro = document.getElementById('form-cadastro');
const painelVerificar = document.getElementById('painel-verificar');
const formVerificar = document.getElementById('form-verificar');
const formReenviar = document.getElementById('form-reenviar');

const tabEntrar = document.getElementById('tab-entrar');
const tabCadastro = document.getElementById('tab-cadastro');
const tabVerificar = document.getElementById('tab-verificar');

function mostrarMensagem(texto, tipo = 'ok') {
  elMsg.textContent = texto;
  elMsg.className = `alerta ${tipo === 'erro' ? 'alerta-erro' : 'alerta-ok'}`;
}

function limparMensagem() {
  elMsg.className = 'alerta oculto';
  elMsg.textContent = '';
}

async function api(url, opcoes = {}) {
  const resp = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(opcoes.headers || {}),
    },
    ...opcoes,
  });
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(dados?.erro?.mensagem || `Erro HTTP ${resp.status}`);
  }
  return dados;
}

function formatarDataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatarCarga(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h > 0 && m > 0) return `${h}h${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function selecionarAba(qual) {
  tabEntrar.classList.toggle('ativa', qual === 'entrar');
  tabCadastro.classList.toggle('ativa', qual === 'cadastro');
  tabVerificar.classList.toggle('ativa', qual === 'verificar');

  formLogin.classList.toggle('oculto', qual !== 'entrar');
  formCadastro.classList.toggle('oculto', qual !== 'cadastro');
  painelVerificar.classList.toggle('oculto', qual !== 'verificar');
}

function mostrarSandbox(sandbox) {
  elCaixaSandbox.replaceChildren();
  if (!sandbox?.verificarUrl) {
    elCaixaSandbox.classList.add('oculto');
    return;
  }
  const titulo = document.createElement('strong');
  titulo.textContent = `${sandbox.aviso} `;
  const link = document.createElement('a');
  link.href = sandbox.verificarUrl;
  link.textContent = 'Clique aqui para simular a verificação de e-mail';
  elCaixaSandbox.append(titulo, link);
  elCaixaSandbox.classList.remove('oculto');
}

function renderizarPerfil() {
  const u = estado.usuario;
  if (!u) {
    elSecaoAcesso.classList.remove('oculto');
    elSecaoPerfil.classList.add('oculto');
    elSecaoMinhas.classList.add('oculto');
    elBtnSair.classList.add('oculto');
    elNavUsuario.textContent = '';
    return;
  }

  elSecaoAcesso.classList.add('oculto');
  elSecaoPerfil.classList.remove('oculto');
  elSecaoMinhas.classList.remove('oculto');
  elBtnSair.classList.remove('oculto');
  elNavUsuario.textContent = `${u.nome} (${u.papel})`;

  document.getElementById('perfil-nome').textContent = u.nome;
  document.getElementById('perfil-email').textContent = u.email;
  const badge = document.getElementById('perfil-badge-verificado');
  if (u.emailVerificado) {
    badge.textContent = 'E-mail verificado';
    badge.className = 'badge badge-ok';
  } else {
    badge.textContent = 'E-mail pendente de verificação';
    badge.className = 'badge badge-aviso';
  }
}

function renderizarAtividades() {
  elListaAtividades.replaceChildren();
  if (estado.atividades.length === 0) {
    const p = document.createElement('p');
    p.className = 'meta';
    p.textContent = 'Nenhuma atividade cadastrada até o momento.';
    elListaAtividades.appendChild(p);
    return;
  }

  const inscricoesAtivasPorAtividade = new Set(
    estado.minhasInscricoes.filter((i) => i.status === 'ativa').map((i) => i.atividadeId),
  );

  for (const a of estado.atividades) {
    const card = document.createElement('div');
    card.className = 'atividade-item';

    const info = document.createElement('div');
    info.className = 'atividade-info';

    const h3 = document.createElement('h3');
    h3.textContent = a.titulo;
    info.appendChild(h3);

    if (a.descricao) {
      const desc = document.createElement('p');
      desc.className = 'meta';
      desc.textContent = a.descricao;
      info.appendChild(desc);
    }

    const horario = document.createElement('p');
    horario.className = 'meta';
    horario.textContent = `${formatarDataHora(a.inicio)} até ${formatarDataHora(a.fim)} • Carga horária: ${formatarCarga(a.cargaHorariaMinutos)}`;
    info.appendChild(horario);

    const acoes = document.createElement('div');
    acoes.className = 'acoes';

    const badgeVagas = document.createElement('span');
    badgeVagas.className = `badge ${a.vagasDisponiveis > 0 ? 'badge-ok' : 'badge-aviso'}`;
    badgeVagas.textContent = `${a.vagasDisponiveis} / ${a.vagas} vagas`;
    acoes.appendChild(badgeVagas);

    if (estado.usuario) {
      const jaInscrito = inscricoesAtivasPorAtividade.has(a.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      if (jaInscrito) {
        btn.className = 'btn-secundario';
        btn.textContent = 'Inscrito';
        btn.disabled = true;
      } else if (a.vagasDisponiveis <= 0) {
        btn.className = 'btn-secundario';
        btn.textContent = 'Lotada';
        btn.disabled = true;
      } else {
        btn.className = 'btn-primario';
        btn.textContent = 'Inscrever-se';
        btn.addEventListener('click', () => void inscrever(a.id));
      }
      acoes.appendChild(btn);
    }

    card.append(info, acoes);
    elListaAtividades.appendChild(card);
  }
}

function renderizarMinhasInscricoes() {
  elListaMinhas.replaceChildren();
  if (!estado.usuario) return;

  if (estado.minhasInscricoes.length === 0) {
    const p = document.createElement('p');
    p.className = 'meta';
    p.textContent = 'Você ainda não se inscreveu em nenhuma atividade.';
    elListaMinhas.appendChild(p);
    return;
  }

  for (const ins of estado.minhasInscricoes) {
    const card = document.createElement('div');
    card.className = 'atividade-item';

    const info = document.createElement('div');
    info.className = 'atividade-info';
    const h3 = document.createElement('h3');
    h3.textContent = ins.atividade.titulo;
    const pHorario = document.createElement('p');
    pHorario.className = 'meta';
    pHorario.textContent = `${formatarDataHora(ins.atividade.inicio)} • Carga: ${formatarCarga(ins.atividade.cargaHorariaMinutos)}`;
    info.append(h3, pHorario);

    const acoes = document.createElement('div');
    acoes.className = 'acoes';

    if (ins.status === 'cancelada') {
      const b = document.createElement('span');
      b.className = 'badge badge-neutro';
      b.textContent = 'Cancelada';
      acoes.appendChild(b);
    } else {
      const bPresenca = document.createElement('span');
      bPresenca.className = `badge ${ins.presente ? 'badge-ok' : 'badge-aviso'}`;
      bPresenca.textContent = ins.presente ? 'Presença confirmada' : 'Aguardando presença';
      acoes.appendChild(bPresenca);

      if (ins.podeEmitirCertificado) {
        const btnCert = document.createElement('button');
        btnCert.type = 'button';
        btnCert.className = 'btn-sucesso';
        btnCert.textContent = 'Baixar certificado (PDF)';
        btnCert.addEventListener('click', () => void baixarCertificado(ins.id, btnCert));
        acoes.appendChild(btnCert);
      } else if (!ins.presente) {
        const btnCancelar = document.createElement('button');
        btnCancelar.type = 'button';
        btnCancelar.className = 'btn-perigo';
        btnCancelar.textContent = 'Cancelar inscrição';
        btnCancelar.addEventListener('click', () => void cancelar(ins.id));
        acoes.appendChild(btnCancelar);
      }
    }

    card.append(info, acoes);
    elListaMinhas.appendChild(card);
  }
}

async function carregarTudo() {
  try {
    const { usuario } = await api('/api/auth/me');
    estado.usuario = usuario;
  } catch {
    estado.usuario = null;
    estado.minhasInscricoes = [];
  }

  const { atividades } = await api('/api/atividades').catch(() => ({ atividades: [] }));
  estado.atividades = atividades;

  if (estado.usuario) {
    const { inscricoes } = await api('/api/inscricoes/minhas').catch(() => ({ inscricoes: [] }));
    estado.minhasInscricoes = inscricoes;
  }

  renderizarPerfil();
  renderizarAtividades();
  renderizarMinhasInscricoes();
}

async function inscrever(atividadeId) {
  limparMensagem();
  try {
    await api('/api/inscricoes', {
      method: 'POST',
      body: JSON.stringify({ atividadeId }),
    });
    mostrarMensagem('Inscrição confirmada com sucesso!');
    await carregarTudo();
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');
  }
}

async function cancelar(inscricaoId) {
  limparMensagem();
  try {
    await api(`/api/inscricoes/${encodeURIComponent(inscricaoId)}/cancelar`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    mostrarMensagem('Inscrição cancelada e vaga liberada.');
    await carregarTudo();
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');
  }
}

function extrairNomeArquivo(cabecalho, fallback) {
  const match = /filename="?([^"]+)"?/i.exec(cabecalho || '');
  return match?.[1] || fallback;
}

async function baixarCertificado(inscricaoId, botao) {
  limparMensagem();
  const textoOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = 'Gerando PDF...';

  try {
    const resp = await fetch(`/api/inscricoes/${encodeURIComponent(inscricaoId)}/certificado`, {
      credentials: 'same-origin',
    });
    if (!resp.ok) {
      const dados = await resp.json().catch(() => ({}));
      throw new Error(dados?.erro?.mensagem || `Erro HTTP ${resp.status}`);
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = extrairNomeArquivo(
      resp.headers.get('Content-Disposition'),
      `certificado-${inscricaoId.slice(0, 8)}.pdf`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    mostrarMensagem('Certificado em PDF gerado com sucesso.');
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');
  } finally {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

tabEntrar.addEventListener('click', () => selecionarAba('entrar'));
tabCadastro.addEventListener('click', () => selecionarAba('cadastro'));
tabVerificar.addEventListener('click', () => selecionarAba('verificar'));

formLogin.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  limparMensagem();
  const fd = new FormData(formLogin);
  try {
    await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        cpf: String(fd.get('cpf') || ''),
        senha: String(fd.get('senha') || ''),
      }),
    });
    formLogin.reset();
    mostrarMensagem('Sessão iniciada com sucesso.');
    await carregarTudo();
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');
  }
});

formCadastro.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  limparMensagem();
  const fd = new FormData(formCadastro);
  try {
    const dados = await api('/api/auth/cadastro', {
      method: 'POST',
      body: JSON.stringify({
        nome: String(fd.get('nome') || ''),
        email: String(fd.get('email') || ''),
        cpf: String(fd.get('cpf') || ''),
        senha: String(fd.get('senha') || ''),
      }),
    });
    formCadastro.reset();
    mostrarMensagem(dados.mensagem);
    mostrarSandbox(dados.sandboxVerificacao);
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');
  }
});

formVerificar.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  limparMensagem();
  const fd = new FormData(formVerificar);
  try {
    const dados = await api('/api/auth/verificar-email', {
      method: 'POST',
      body: JSON.stringify({ token: String(fd.get('token') || '') }),
    });
    formVerificar.reset();
    mostrarMensagem(dados.mensagem);
    selecionarAba('entrar');
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');
  }
});

formReenviar.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  limparMensagem();
  const fd = new FormData(formReenviar);
  try {
    const dados = await api('/api/auth/reenviar-verificacao', {
      method: 'POST',
      body: JSON.stringify({
        cpf: String(fd.get('cpf') || ''),
        senha: String(fd.get('senha') || ''),
      }),
    });
    formReenviar.reset();
    mostrarMensagem(dados.mensagem);
    mostrarSandbox(dados.sandboxVerificacao);
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');
  }
});

elBtnSair.addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST', body: '{}' }).catch(() => undefined);
  estado.usuario = null;
  estado.minhasInscricoes = [];
  mostrarMensagem('Você saiu da sua conta.');
  await carregarTudo();
});

document.getElementById('btn-atualizar-atividades').addEventListener('click', () => void carregarTudo());

void carregarTudo();
