(async () => {
  const podcasts = document.querySelectorAll('.artifact-item-button');
  console.log(`Encontrados ${podcasts.length} podcasts. Iniciando processo...`);

  for (let i = 0; i < podcasts.length; i++) {
    const podcast = podcasts[i];
    const trigger = podcast.querySelector('.mat-mdc-menu-trigger');

    if (trigger) {
      console.log(`[${i + 1}/${podcasts.length}] Abrindo menu do podcast...`);
      trigger.scrollIntoView({ block: 'center' });
      trigger.click();

      // Aguarda um curto tempo para o menu (overlay) renderizar no DOM
      await new Promise(resolve => setTimeout(resolve, 500));

      // Busca o item de menu com as características informadas
      // Nota: selecionei especificamente o item visível/focado (tabindex="0")
      const menuItem = document.querySelectorAll('[role="menuitem"][tabindex="0"]')[2];

      if (menuItem) {
        console.log(`[${i + 1}/${podcasts.length}] Clicando no item de menu...`);
        menuItem.click();
      } else {
        console.warn(`[${i + 1}/${podcasts.length}] Item de menu não encontrado após abrir.`);
      }

      console.log(`Aguardando 10 segundos para o próximo...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    } else {
      console.warn(`[${i + 1}/${podcasts.length}] Gatilho do menu não encontrado.`);
    }
  }

  console.log('Processo finalizado com sucesso.');
})();