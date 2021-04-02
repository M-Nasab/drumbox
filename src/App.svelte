<script>
  import MusicBox from './components/MusicBox.svelte';
</script>

<div class="container">
  <div class="m-box-wrapper">
    <MusicBox
      steps={6}
      steppers={4}
    />
  </div>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100vw;
    height: 100vh;
  }

  .m-box-wrapper {
    max-width: 400px;
    width: 100%;
  }
</style>