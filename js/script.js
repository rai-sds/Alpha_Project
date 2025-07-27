// js/script.js

// 0) Inicializa Supabase
const SUPABASE_URL = 'https://fraarlhecaiygfmdjqcr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyYWFybGhlY2FpeWdmbWRqcWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMjU2MjIsImV4cCI6MjA2NzYwMTYyMn0.bQZqD3d3NudHvqFWyzCfNcf4SbSi5IwwmJJkrIPKbNA'; // sua chave real
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 1) Logout global
window.logout = () => {
  alert('Sessão encerrada!');
  window.location.href = '../index.html';
};

// 2) Relógio em tempo real
function atualizarHora() {
  const elHora = document.getElementById('hora-atual');
  const elData = document.getElementById('data-hoje');
  const now    = new Date();
  if (elHora) elHora.textContent = now.toLocaleTimeString('pt-BR');
  if (elData) elData.textContent = now.toLocaleDateString('pt-BR');
}
if (document.getElementById('hora-atual') || document.getElementById('data-hoje')) {
  atualizarHora();
  setInterval(atualizarHora, 1000);
}

// 3) Check-in de voluntário
const checkboxAtraso = document.getElementById('chegou-atrasado');
const divMotivo      = document.getElementById('motivo-atraso-div');
if (checkboxAtraso && divMotivo) {
  divMotivo.style.display = 'none';
  checkboxAtraso.addEventListener('change', () => {
    divMotivo.style.display = checkboxAtraso.checked ? 'block' : 'none';
  });
}

const formCheckin = document.getElementById('form-checkin');
if (formCheckin) {
  formCheckin.addEventListener('submit', async e => {
    e.preventDefault();

    const nome         = formCheckin.nome.value.trim();
    const departamento = formCheckin.departamento.value;
    const atrasado     = checkboxAtraso?.checked || false;
    const motivo       = atrasado ? formCheckin.motivo.value.trim() : null;

    if (!nome || !departamento) {
      alert('Preencha nome e área de atuação.');
      return;
    }
    if (atrasado && !motivo) {
      alert('Informe o motivo do atraso.');
      return;
    }

    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const bsMs = utcMs - 3 * 60 * 60 * 1000;
    const horaISO = new Date(bsMs).toISOString();

    const { error } = await supabaseClient
      .from('checkins')
      .insert([{
        nome_completo:   nome,
        area_atuacao:    departamento,
        chegou_atrasado: atrasado,
        motivo_atraso:   motivo,
        hora_checkin:    horaISO
      }]);

    if (error) {
      alert('Falha ao registrar check-in: ' + error.message);
      return;
    }

    alert('✅ Check-in registrado com sucesso!');
    formCheckin.reset();
    if (divMotivo) divMotivo.style.display = 'none';
  });
}

// 4) Utilitários diversos
document.getElementById('btn-copiar-url')?.addEventListener('click', () => {
  const el = document.getElementById('checkin-url');
  if (el?.textContent.trim()) {
    navigator.clipboard.writeText(el.textContent.trim());
    alert('URL copiada!');
  } else {
    alert('URL não encontrada.');
  }
});

document.getElementById('btn-baixar-qr')?.addEventListener('click', () => {
  const img = document.querySelector('.qr-section img');
  if (img?.src) {
    const link = document.createElement('a');
    link.href = img.src;
    link.download = 'qrcode.png';
    link.click();
  } else {
    alert('QR Code não encontrado.');
  }
});

document.getElementById('btn-compartilhar')?.addEventListener('click', () => {
  const url = document.getElementById('checkin-url')?.textContent.trim();
  if (navigator.share && url) {
    navigator.share({ title: 'Check-in Voluntários', url });
  } else {
    alert('Compartilhamento não suportado neste dispositivo.');
  }
});

// 5) Dashboard — total de check-ins e atrasos
if (document.body.classList.contains('admin-dashboard')) {
  const elCheckins = document.getElementById('total-checkins');
  const elAtrasos  = document.getElementById('total-atrasos');
  const elData     = document.getElementById('data-hoje');

  if (elData) {
    elData.textContent = new Date().toLocaleDateString('pt-BR');
  }

  async function carregarResumo() {
    const { data, error } = await supabaseClient
      .from('checkins')
      .select('chegou_atrasado');

    if (error || !data) {
      console.error('🚨 Supabase erro no dashboard:', error);
      elCheckins.textContent = '!';
      elAtrasos.textContent  = '!';
      return;
    }

    elCheckins.textContent = data.length;
    elAtrasos.textContent  = data.filter(r => r.chegou_atrasado).length;
  }

  carregarResumo();
}

// 6) Registros e Exportação CSV
const filtroNome       = document.getElementById('filtro-nome');
const filtroDepto      = document.getElementById('filtro-departamento');
const filtroAtrasados  = document.getElementById('filtro-atrasados');
const tabelaRegistros  = document.getElementById('tabela-registros');

async function carregarRegistros() {
  const { data, error } = await supabaseClient
    .from('checkins')
    .select('nome_completo,area_atuacao,hora_checkin,chegou_atrasado,motivo_atraso')
    .order('hora_checkin', { ascending: false });

  if (error || !data) {
    tabelaRegistros.innerHTML =
      `<tr><td colspan="5">Erro ao carregar registros.</td></tr>`;
    console.error('🚨 Supabase erro:', error);
    return [];
  }

  return data;
}

function aplicarFiltros(data) {
  const nomeFiltro  = filtroNome?.value.toLowerCase() || "";
  const deptoFiltro = filtroDepto?.value || "";
  const atrasados   = filtroAtrasados?.checked || false;

  return data.filter(r => {
    const nomeOk  = r.nome_completo?.toLowerCase().includes(nomeFiltro);
    const deptoOk = !deptoFiltro || r.area_atuacao === deptoFiltro;
    const atrasoOk = !atrasados || r.chegou_atrasado;
    return nomeOk && deptoOk && atrasoOk;
  });
}

function preencherTabela(lista) {
  if (!tabelaRegistros) return;

  if (lista.length === 0) {
    tabelaRegistros.innerHTML = `<tr><td colspan="5">Nenhum registro encontrado com esses filtros.</td></tr>`;
    return;
  }

  tabelaRegistros.innerHTML = lista.map(r => `
    <tr>
      <td>${r.nome_completo}</td>
      <td>${r.area_atuacao}</td>
      <td>${new Date(r.hora_checkin).toLocaleString('pt-BR')}</td>
      <td>${r.chegou_atrasado ? 'Atrasado' : 'Pontual'}</td>
      <td>${r.chegou_atrasado ? (r.motivo_atraso || 'Não informado') : ''}</td>
    </tr>
  `).join('');
}

document.getElementById('btn-filtrar-registros')?.addEventListener('click', async () => {
  const registros = await carregarRegistros();
  const filtrados = aplicarFiltros(registros).sort((a, b) =>
    new Date(b.hora_checkin) - new Date(a.hora_checkin)
  );
  preencherTabela(filtrados);
});

document.getElementById('btn-exportar-registros')?.addEventListener('click', async () => {
  const registros = await carregarRegistros();
  const filtrados = aplicarFiltros(registros).sort((a, b) =>
    new Date(b.hora_checkin) - new Date(a.hora_checkin)
  );

  if (filtrados.length === 0) {
    alert('Nenhum registro encontrado para exportar.');
    return;
  }

      const linhas = [
  ["Nome","Departamento","Data/Hora","Status","Motivo do Atraso"],
  ...filtrados.map(r => [
    r.nome_completo || "",
    r.area_atuacao || "",
    new Date(r.hora_checkin).toLocaleString('pt-BR'),
    r.chegou_atrasado ? "Atrasado" : "Pontual",
    r.chegou_atrasado ? (r.motivo_atraso || "Não informado") : ""
  ])
];

const csv = linhas.map(l => l.join(';')).join('\n');
const blob = new Blob([csv], { type: 'text/csv' });
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = 'registros.csv';
link.click();

alert(`✅ Exportado com sucesso: ${filtrados.length} registros`);
});
// 7) Analytics de Check-in

const selPeriodo   = document.getElementById('periodo');
const botaoFiltrar = document.getElementById('botao-filtrar');

if (selPeriodo && botaoFiltrar) {
  let chartDept, chartPont;
  const chartColors = ['#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6','#6366f1','#ec4899','#22d3ee'];

  botaoFiltrar.addEventListener('click', async () => {
    console.clear();
    console.log('📊 Botão Filtrar clicado | Período selecionado:', selPeriodo.value);

    let query = supabaseClient
      .from('checkins')
      .select('area_atuacao,chegou_atrasado,hora_checkin');

    if (selPeriodo.value !== 'todos') {
      const dias = Number(selPeriodo.value);
      const agora = new Date();
      const corte = new Date(agora.getTime() - dias * 86400000);
      query = query.gte('hora_checkin', corte.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error('🚨 Supabase erro Analytics:', error);
      alert('Erro ao buscar dados: ' + error.message);
      return;
    }

    if (!data || data.length === 0) {
      alert('Nenhum registro para este período.');
      return;
    }

    // Presença por departamento
    const contDept = {};
    data.forEach(r => {
      const area = r.area_atuacao || 'Não definido';
      contDept[area] = (contDept[area] || 0) + 1;
    });

    const labels = Object.keys(contDept);
    const values = labels.map(l => contDept[l]);

    // Legenda
    const legendaEl = document.getElementById('legenda-deptos');
    if (legendaEl) {
      legendaEl.innerHTML = labels.map((l, i) =>
        `<li><span style="background:${chartColors[i % chartColors.length]}"></span>${l}</li>`
      ).join('');
    }

    // Gráfico de barras
    const canvasDepto = document.getElementById('graficoDepartamentos');
    if (canvasDepto) {
      if (!chartDept) {
        chartDept = new Chart(canvasDepto, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Check-ins',
              data: values,
              backgroundColor: chartColors.slice(0, labels.length)
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: { beginAtZero: true },
              x: { grid: { display: false } }
            }
          }
        });
      } else {
        chartDept.data.labels = labels;
        chartDept.data.datasets[0].data = values;
        chartDept.update();
      }
    }

    // Pontualidade geral
    let pontual = 0, atrasado = 0;
    data.forEach(r => r.chegou_atrasado ? atrasado++ : pontual++);

    const canvasPont = document.getElementById('graficoPontualidade');
    if (canvasPont) {
      if (!chartPont) {
        chartPont = new Chart(canvasPont, {
          type: 'doughnut',
          data: {
            labels: ['Pontuais', 'Atrasados'],
            datasets: [{
              data: [pontual, atrasado],
              backgroundColor: ['#10b981', '#ef4444']
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'bottom' }
            }
          }
        });
      } else {
        chartPont.data.datasets[0].data = [pontual, atrasado];
        chartPont.update();
      }
    }

    // Debug opcional
    const debugEl = document.getElementById('debug-table');
    if (debugEl) {
      debugEl.innerHTML =
        `<table><tr><th>Área</th><th>Qtd</th></tr>` +
        labels.map((l, i) => `<tr><td>${l}</td><td>${values[i]}</td></tr>`).join('') +
        `</table>`;
    }
  });
}
// 8) Funções globais para index.html

function copiarURL() {
  const el = document.getElementById('checkin-url');
  if (el?.textContent.trim()) {
    navigator.clipboard.writeText(el.textContent.trim());
    alert('URL copiada!');
  } else {
    alert('URL não encontrada.');
  }
}

function baixarQR() {
  const img = document.querySelector('.qr-section img');
  if (img?.src) {
    const link = document.createElement('a');
    link.href = img.src;
    link.download = 'qrcode.png';
    link.click();
  } else {
    alert('QR Code não encontrado.');
  }
}

function compartilhar() {
  const url = document.getElementById('checkin-url')?.textContent.trim();
  if (navigator.share && url) {
    navigator.share({ title: 'Check-in Voluntários', url });
  } else {
    alert('Compartilhamento não suportado neste dispositivo.');
  }
}
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('mobile-visible');
  sidebar.classList.toggle('mobile-hidden');
}

document.addEventListener('click', function (e) {
  const sidebar = document.querySelector('.sidebar');
  const menuBtn = document.querySelector('.menu-toggle');

  if (
    sidebar.classList.contains('mobile-visible') &&
    !sidebar.contains(e.target) &&
    !menuBtn.contains(e.target)
  ) {
    sidebar.classList.remove('mobile-visible');
    sidebar.classList.add('mobile-hidden');
  }
});



// Funções
function toggleSidebar() {
  document.querySelector('.sidebar')?.classList.toggle('mobile-visible');
}

async function carregarRegistros() {
  const { data, error } = await supabaseClient
    .from('checkins')
    .select('nome_completo,area_atuacao,hora_checkin,chegou_atrasado,motivo_atraso');

  if (error || !data) {
    tabelaRegistros.innerHTML = `<tr><td colspan="5">Erro ao carregar registros.</td></tr>`;
    console.error('🚨 Supabase erro:', error);
    return [];
  }

  return data;
}

function aplicarFiltros(data) {
  const nomeFiltro = filtroNome.value.toLowerCase();
  const departamentoFiltro = filtroDepto.value;
  const apenasAtrasados = filtroAtrasados.checked;

  return data.filter(r => {
    const nomeMatch = r.nome_completo?.toLowerCase().includes(nomeFiltro);
    const deptoMatch = !departamentoFiltro || r.area_atuacao === departamentoFiltro;
    const atrasoMatch = !apenasAtrasados || r.chegou_atrasado;
    return nomeMatch && deptoMatch && atrasoMatch;
  });
}

function preencherTabela(lista) {
  if (lista.length === 0) {
    tabelaRegistros.innerHTML = `<tr><td colspan="5">Nenhum registro encontrado com esses filtros.</td></tr>`;
    return;
  }

  tabelaRegistros.innerHTML = lista.map(r => `
    <tr>
      <td>${r.nome_completo}</td>
      <td>${r.area_atuacao}</td>
      <td>${new Date(r.hora_checkin).toLocaleString('pt-BR')}</td>
      <td>${r.chegou_atrasado ? 'Atrasado' : 'Pontual'}</td>
      <td>${r.chegou_atrasado ? (r.motivo_atraso || 'Não informado') : ''}</td>
    </tr>
  `).join('');
}

document.getElementById('btn-filtrar-registros')?.addEventListener('click', async () => {
  const registros = await carregarRegistros();
  const filtrados = aplicarFiltros(registros);
  preencherTabela(filtrados);
});

document.getElementById('btn-exportar-registros')?.addEventListener('click', async () => {
  const registros = await carregarRegistros();
  const filtrados = aplicarFiltros(registros);

  if (filtrados.length === 0) {
    alert('Nenhum registro encontrado para exportar.');
    return;
  }

  const linhas = [
    ["Nome", "Departamento", "Data/Hora", "Status", "Motivo do Atraso"],
    ...filtrados.map(r => [
      r.nome_completo || "",
      r.area_atuacao || "",
      new Date(r.hora_checkin).toLocaleString('pt-BR'),
      r.chegou_atrasado ? "Atrasado" : "Pontual",
      r.chegou_atrasado ? (r.motivo_atraso || "Não informado") : ""
    ])
  ];

  const csv = linhas.map(l => l.join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'registros.csv';
  link.click();
});

(async () => {
  const registros = await carregarRegistros();
  preencherTabela(registros);
})();

function logout() {
  alert('Sessão encerrada!');
  window.location.href = '../index.html';
}
if (document.body.classList.contains('admin-page')) {
  const form = document.getElementById('form-adicionar');
  const feedback = document.getElementById('mensagem-feedback');

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const email = document.getElementById('novoEmail').value.trim();
    const senha = document.getElementById('novaSenha').value.trim();

    feedback.textContent = '⏳ Enviando...';
    feedback.style.color = '#444';

    // 🔎 Verifica se e-mail já existe para evitar erro 409
    const { data: existente } = await supabaseClient
      .from('admin')
      .select('email')
      .eq('email', email)
      .single();

    if (existente) {
      feedback.textContent = '⚠️ E-mail já cadastrado!';
      feedback.style.color = '#d0342c';
      return;
    }

    // 🔐 Insere novo admin
    const { data, error } = await supabaseClient
      .from('admin')
      .insert([{ email, senha }]);

    if (error) {
      feedback.textContent = '❌ Erro: ' + error.message;
      feedback.style.color = '#d0342c';
    } else {
      feedback.textContent = '✅ Administrador cadastrado!';
      feedback.style.color = '#228b22';
      form.reset();
    }
  });
}
