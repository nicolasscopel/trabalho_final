const elStatus = document.getElementById('status-verificacao');
const form = document.getElementById('form-token-manual');
const inputToken = document.getElementById('input-token');

function exibir(texto, tipo) {
  elStatus.textContent = texto;
  elStatus.className = `alerta ${tipo === 'erro' ? 'alerta-erro' : 'alerta-ok'}`;
}

async function verificar(token) {
  try {
    const resp = await fetch('/api/auth/verificar-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(dados?.erro?.mensagem || 'Não foi possível verificar o e-mail.');
    }
    exibir(`${dados.mensagem} Você já pode voltar e fazer login para se inscrever.`, 'ok');
  } catch (erro) {
    exibir(erro.message, 'erro');
  }
}

const params = new URLSearchParams(window.location.search);
const tokenUrl = params.get('token');
if (tokenUrl) {
  inputToken.value = tokenUrl;
  void verificar(tokenUrl);
}

form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  void verificar(inputToken.value.trim());
});
