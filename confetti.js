function confetti() {
    // Create a canvas element that covers the whole screen
    var canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    // Get the 2D rendering context
    var ctx = canvas.getContext("2d");

    // Function to generate a random number within a range
    function randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    // Function to create a confetti particle
    function createConfettiParticle() {
        var colors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#00FFFF", "#FF00FF"];
        var particle = {
            x: randomRange(0, canvas.width),
            y: randomRange(-canvas.height, 0),
            size: randomRange(5, 20),
            color: colors[Math.floor(randomRange(0, colors.length))],
            rotation: randomRange(0, 2 * Math.PI),
            rotationSpeed: randomRange(-Math.PI / 4, Math.PI / 4),
            velocity: {
                x: randomRange(-30, 30),
                y: randomRange(50, 100)
            }
        };
        return particle;
    }

    // Array to store the confetti particles
    var particles = [];

    // Function to animate the confetti particles
    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (var i = 0; i < particles.length; i++) {
            var particle = particles[i];

            // Update particle position and rotation
            particle.x += particle.velocity.x / 60;
            particle.y += particle.velocity.y / 60;
            particle.rotation += particle.rotationSpeed / 60;

            // Draw the particle
            ctx.save();
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            ctx.fillStyle = particle.color;
            ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
            ctx.restore();

            // Remove the particle if it goes off screen
            if (particle.y > canvas.height) {
                particles.splice(i, 1);
                i--;
            }
        }

        // Request the next animation frame
        requestAnimationFrame(animateParticles);
    }

    // Function to start the confetti effect
    function startConfetti() {
        particles = [];
        animateParticles();

        // Create new particles at an interval
        var interval = setInterval(function () {
            if (particles.length < 100) {
                particles.push(createConfettiParticle());
            } else {
                clearInterval(interval);
            }
        }, 200);
    }

    // Call the startConfetti function to begin the effect
    startConfetti();
}

socket.on('confetti', confetti);