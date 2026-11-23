export interface MensagemVerificacaoEmail {
  usuarioId: string;
  nome: string;
  email: string;
  token: string;
  linkVerificacao: string;
  expiraEm: Date;
}

export interface EnviadorEmail {
  enviarVerificacao(mensagem: MensagemVerificacaoEmail): Promise<void>;
}

const LIMITE_SANDBOX = 100;

/**
 * Adaptador de e-mail em modo sandbox controlado.
 *
 * Privacidade: NÃO grava em arquivo público, NÃO expõe caixa de entrada por
 * rota HTTP e NÃO imprime e-mail/token no console. Fica apenas em memória para
 * validação controlada em testes ou inspeção programática.
 */
export class SandboxEnviadorEmail implements EnviadorEmail {
  readonly #mensagens: MensagemVerificacaoEmail[] = [];

  async enviarVerificacao(mensagem: MensagemVerificacaoEmail): Promise<void> {
    if (this.#mensagens.length >= LIMITE_SANDBOX) {
      this.#mensagens.shift();
    }
    this.#mensagens.push(mensagem);
  }

  listarPara(email: string): MensagemVerificacaoEmail[] {
    const alvo = email.trim().toLowerCase();
    return this.#mensagens.filter((m) => m.email === alvo);
  }

  ultimaPara(email: string): MensagemVerificacaoEmail | undefined {
    const lista = this.listarPara(email);
    return lista.at(-1);
  }

  get quantidade(): number {
    return this.#mensagens.length;
  }

  limpar(): void {
    this.#mensagens.length = 0;
  }
}
