// Lista de espera: valida o formulário e grava a inscrição na tabela lista_espera do Supabase.
// A chave publicável só permite inserir (RLS); ninguém consegue ler a lista pela página.
(() => {
  const cfg = window.EIXO_CONFIG || {};
  const form = document.getElementById('form');
  const erro = document.getElementById('erro');
  const enviar = document.getElementById('enviar');
  const sucesso = document.getElementById('sucesso');

  // origem da visita, para saber qual canal trouxe cada inscrição
  const params = new URLSearchParams(location.search);
  const origem = {
    utm_source: params.get('utm_source'), utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'), referrer: document.referrer || null,
  };
  for (const k in origem) if (origem[k]) origem[k] = origem[k].slice(0, 200);

  // quem prefere menos movimento não recebe o vídeo tocando sozinho
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const v = document.querySelector('.hero-video video'); v.removeAttribute('autoplay'); v.pause();
  }

  const EMAIL =/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function marcar(el, invalido) {
    const alvo = el.closest('fieldset') || el.closest('.consentimento');
    if (alvo) alvo.classList.toggle('invalido', invalido);
    else el.setAttribute('aria-invalid', String(invalido));
  }

  function validar(d) {
    const faltando = [];
    const checa = (nome, ok, rotulo) => {
      const el = form.elements[nome];
      marcar(el instanceof RadioNodeList ? el[0] : el, !ok);
      if (!ok) faltando.push(rotulo);
    };
    checa('email', EMAIL.test(d.email), 'um e-mail válido');
    checa('perfil', !!d.perfil, 'quem está se inscrevendo');
    checa('nivel', !!d.nivel, 'o nível');
    checa('tempo_pratica', !!d.tempo_pratica, 'o tempo de prática');
    checa('uso_pago', !!d.uso_pago, 'como você usaria o app');
    checa('consentimento', d.consentimento, 'o consentimento');
    return faltando;
  }

  function mostrarErro(msg) { erro.textContent = msg; erro.hidden = !msg; }

  form.addEventListener('change', e => { if (e.target.name) marcar(e.target, false); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    mostrarErro('');
    const f = form.elements;
    if (f.site.value) return concluir(); // robô preencheu o campo escondido

    const dados = {
      email: f.email.value.trim().toLowerCase(),
      perfil: f.perfil.value || null,
      nivel: f.nivel.value || null,
      tempo_pratica: f.tempo_pratica.value || null,
      uso_pago: f.uso_pago.value || null,
      cidade: f.cidade.value.trim() || null,
      uf: f.uf.value || null,
      whatsapp: f.whatsapp.value.replace(/[^\d+]/g, '') || null,
      consentimento: f.consentimento.checked,
      ...origem,
    };
    const faltando = validar(dados);
    if (faltando.length) {
      mostrarErro(`Falta preencher: ${faltando.join(', ')}.`);
      form.querySelector('[aria-invalid=true], .invalido input')?.focus();
      return;
    }
    if (!cfg.supabaseUrl || !cfg.supabaseKey) { mostrarErro('A lista ainda não está conectada. Tente de novo mais tarde.'); return; }

    enviar.disabled = true; enviar.textContent = 'Enviando…';
    try {
      const r = await fetch(`${cfg.supabaseUrl}/rest/v1/lista_espera`, {
        method: 'POST',
        headers: { apikey: cfg.supabaseKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(dados),
      });
      // 409: e-mail já inscrito — para a pessoa, o resultado é o mesmo
      if (r.ok || r.status === 409) return concluir();
      throw new Error(`HTTP ${r.status}`);
    } catch {
      mostrarErro('Não conseguimos enviar agora. Confira sua conexão e tente de novo.');
      enviar.disabled = false; enviar.textContent = 'Entrar na lista de espera';
    }
  });

  function concluir() {
    form.hidden = true;
    sucesso.hidden = false;
    sucesso.focus();
  }
})();
