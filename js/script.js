// js/script.js

// 0) Inicializa Supabase
const SUPABASE_URL = 'https://fraarlhecaiygfmdjqcr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyYWFybGhlY2FpeWdmbWRqcWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMjU2MjIsImV4cCI6MjA2NzYwMTYyMn0.bQZqD3d3NudHvqFWyzCfNcf4SbSi5IwwmJJkrIPKbNA';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
  // 1) Relógio em tempo real
  function atualizarHora() {
    const agora = new Date();
    const relogio = document.getElementById('hora-atual');
    const dataHoje = document.getElementById('data-hoje');
    if (relogio) relogio.textContent = agora.toLocaleTimeString('pt-BR');
    if (dataHoje) dataHoje.textContent = agora.toLocaleDateString('pt-BR');
  }
  setInterval(atualizarHora, 1000);
  atualizarHora();

  // 2) Mostrar/ocultar campo de motivo
  const checkboxAtraso = document.getElementById('chegou-atrasado');
  const campoMotivo = document.getElementById('motivo-atraso-div');
  if (checkboxAtraso && campoMotivo) {
    checkboxAtraso.addEventListener('change', () => {
      campoMotivo.style.display = checkboxAtraso.checked ? 'block' : 'none';
    });
  }

  // 3) Enviar formulário de check-in
  const formCheckin = document.getElementById('form-checkin');
  if (formCheckin) {
    formCheckin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = formCheckin.nome.value.trim();
      const departamento = formCheckin.departamento.value;
      const atrasado = checkboxAtraso.checked;
      const motivo = atrasado ? formCheckin.motivo.value.trim() : null;

      if (!nome || !departamento) return alert('Preencha nome e área de atuação.');
      if (atrasado && !motivo) return alert('Informe o motivo do atraso.');

      try {
        const { error } = await supabaseClient.from('checkins').insert([{
          nome_completo: nome,
          area_atuacao: departamento,
          chegou_atrasado: atrasado,
          motivo_atraso: motivo,
          hora_checkin: new Date().toISOString()
        }]);
        if (error) {
          console.error('Erro Supabase:', error);
          return alert('Falha ao registrar check-in: ' + error.message);
        }
        alert('Check-in registrado com sucesso!');
        formCheckin.reset();
        campoMotivo.style.display = 'none';
      } catch (err) {
        console.error('Erro inesperado:', err);
        alert('Erro inesperado. Veja o console.');
      }
    });
  }

  // 4) Botão copiar URL
  const btnCopiar = document.getElementById('btn-copiar-url');
  if (btnCopiar) {
    btnCopiar.addEventListener('click', copiarURL);
  }

  // 5) Baixar QR Code
  const btnBaixarQR = document.getElementById('btn-baixar-qr');
  if (btnBaixarQR) {
    btnBaixarQR.addEventListener('click', baixarQR);
  }

  // 6) Compartilhar
  const btnCompartilhar = document.getElementById('btn-compartilhar');
  if (btnCompartilhar) {
    btnCompartilhar.addEventListener('click', compartilhar);
  }

  // 7) Logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      alert('Sessão encerrada!');
      window.location.href = '../index.html';
    });
  }

  // 8) Simulação do dashboard
  function simularDashboard() {
    const totalEl = document.getElementById('total-checkins');
    const atrasosEl = document.getElementById('total-atrasos');
    if (totalEl) totalEl.textContent = 12;
    if (atrasosEl) atrasosEl.textContent = 3;
  }
  simularDashboard();

  // 9) Exportar CSV
  const btnExportar = document.getElementById('btn-exportar-csv');
  if (btnExportar) {
    btnExportar.addEventListener('click', () => {
      const registros = [
        ["Nome", "Departamento", "Data/Hora", "Status", "Motivo do Atraso"],
        ["Raí Souza", "STAFF", "2025-07-06 08:00", "Pontual", ""],
        ["Joana Lima", "MÍDIA", "2025-07-06 08:15", "Atrasado", "Trânsito"],
      ];
      let csv = '';
      registros.forEach(linha => csv += linha.join(';') + '\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'registros.csv';
      link.click();
    });
  }

  // 10) Gráficos com Chart.js
  function atualizarGraficos() {
    const ctxDeptos = document.getElementById('graficoDepartamentos');
    const ctxPontual = document.getElementById('graficoPontualidade');
    if (ctxDeptos) {
      new Chart(ctxDeptos, {
        type: 'bar',
        data: {
          labels: ['STAFF', 'MÍDIA', 'SOM', 'LIMPEZA'],
          datasets: [{
            label: 'Check-ins',
            data: [4, 3, 2, 1],
            backgroundColor: '#3b82f6'
          }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
      });
    }
    if (ctxPontual) {
      new Chart(ctxPontual, {
        type: 'doughnut',
        data: {
          labels: ['Pontuais', 'Atrasados'],
          datasets: [{
            data: [9, 3],
            backgroundColor: ['#10b981', '#ef4444']
          }]
        },
        options: { responsive: true }
      });
    }
  }
  window.addEventListener('load', atualizarGraficos);
});

// 📌 Funções globais chamadas via onclick (usadas no index.html)

function copiarURL() {
  const urlEl = document.getElementById('checkin-url');
  if (urlEl && urlEl.textContent.trim()) {
    navigator.clipboard.writeText(urlEl.textContent.trim());
    alert('URL copiada para a área de transferência!');
  } else {
    alert('Elemento de URL não encontrado.');
  }
}

function baixarQR() {
  const img = document.querySelector('.qr-section img');
  if (img && img.src) {
    const link = document.createElement('a');
    link.href = img.src;
    link.download = 'qrcode.png';
    link.click();
  } else {
    alert('Imagem do QR Code não encontrada.');
  }
}

function compartilhar() {
  const url = document.getElementById('checkin-url')?.textContent.trim();
  if (navigator.share && url) {
    navigator.share({ title: 'Check-in Voluntários', url });
  } else {
    alert('Recurso de compartilhamento não suportado neste dispositivo.');
  }
}
