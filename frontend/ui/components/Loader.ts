
export default {
  show: function (text: string = '') {
    if (process.browser) {
      const loader = document.getElementById('loader');
      if (loader) {
        loader.style.display = 'flex';
      }
      const loaderText = document.getElementById('loaderText');
      if (loaderText) {
        loaderText.innerText = text;
      }
    }
  },
  dismiss: function () {
    if (process.browser) {
      const loader = document.getElementById('loader');
      if (loader) {
        loader.style.display = 'none';
      }
    }
  }
}