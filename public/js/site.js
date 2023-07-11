document.addEventListener('DOMContentLoaded', function () {
    const ad = document.getElementById('ad');
    
    // Add click event listener to the ad
    ad.addEventListener('click', function () {
      const currentTime = new Date();
      
      // Send a POST request to the server to record the time
      axios.post('/record-time', { time: currentTime.toISOString() })
        .then(function (response) {
          // Retrieve the comparison result from the response and redirect accordingly
          if (response.data === 'win') {
            window.location.href = 'win.html';
          } else {
            window.location.href = 'lose.html';
          }
        })
        .catch(function (error) {
          console.log(error.response);
        });
    });
  });
  