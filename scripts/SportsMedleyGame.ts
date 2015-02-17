﻿declare var Matter: any;

module SportsMedley {
    export class SportsMedleyGame {
        gameTypes: string[] = ["Hockey", "Ultimate Flying Disc", "Dodgeball", "Kill The Carrier"];
        attentionSpan: number = 25000;
        totalRounds: number = 11;

        domNode: HTMLElement;
        engine: any;
        gameType: string;
        timestamp: number;
        lastGameChangedAt: number;
        gamepadListener: Input.GamepadListener;
        gym: Entities.Gymnasium;
        players: Entities.Player[];
        scores: any;
        rounds: number;

        constructor(domNode: HTMLElement) {
            this.domNode = domNode;
            this.engine = this.createEngine(domNode);
            this.gym = new Entities.Gymnasium(this);
            this.players = [];
            this.gamepadListener = new Input.GamepadListener(domNode, this);
            
            Matter.Events.on(this.engine, 'collisionStart', this.onCollisionActive.bind(this));
            Matter.Events.on(this.engine, 'tick', this.onTick.bind(this));
            Matter.Events.on(this.engine, 'afterRender', this.afterRender.bind(this));

            this.reset();
        }

        public getWorld(): any {
            return this.engine.world;
        }

        public playSound(name: string): void {}

        public score(team: number, value: number): void {
            if (this.players.length > 1 && this.gamepadListener && !this.gamepadListener.setupPlayer) {
                console.info("Team %s got a point in %s", team, this.gameType);
                this.scores[team][this.gameType]++;
                this.scores[team].Total += value;

                this.updateScoreboard();
            }
        }

        private createEngine(domNode: HTMLElement): any {
            var gameWidth: number = 1366;
            var gameHeight: number = 768;

            var gameDimensions: any = {
                min: { x: 0, y: 0 },
                max: { x: gameWidth, y: gameHeight }
            };

            var engine: any = Matter.Engine.create(domNode, {
                world: { bounds: gameDimensions },
                render: {
                    bounds: gameDimensions,
                    options: {
                        wireframes: false,
                        width: gameWidth,
                        height: gameHeight,
                        showAngleIndicator: true
                    }
                }
            });

            var canvas: HTMLCanvasElement = engine.render.canvas;

            Matter.Render.setBackground(engine.render, "url(assets/images/gymnasium.png)");

            //NOTE: this is gross.
            setTimeout(() => {
                canvas.style.backgroundImage = "url(assets/images/gymnasium.png)";
                canvas.style.backgroundSize = gameWidth + "px " + gameHeight + "px";
            });

            canvas.addEventListener('click', () => {
                var htmlBody: any = document.body;
                if (htmlBody.requestFullscreen) {
                    htmlBody.requestFullscreen();
                } else if (htmlBody.msRequestFullscreen) {
                    htmlBody.msRequestFullscreen();
                } else if (htmlBody.mozRequestFullScreen) {
                    htmlBody.mozRequestFullScreen();
                } else if (htmlBody.webkitRequestFullscreen) {
                    htmlBody.webkitRequestFullscreen();
                }
            });

            engine.render.options.showAngleIndicator = true;

            engine.world.gravity.x = engine.world.gravity.y = 0;

            Matter.Engine.run(engine);

            return engine;
        }

        private reset(): void {
            this.rounds = 0;

            this.scores = [
                { Total: 0, Bonus: 0 },
                { Total: 0, Bonus: 0 }
            ];
            this.gameTypes.forEach((gameType: string) => {
                this.scores[0][gameType] = 0;
                this.scores[1][gameType] = 0;
            });

            this.updateScoreboard();
        }

        private onTick(tickEvent: any) {
            this.timestamp = tickEvent.timestamp;
            this.gamepadListener.pollGamepads(tickEvent);

            this.getWorld().bodies.forEach(body => {
                if (body.pawn)
                    body.pawn.tick(tickEvent);
            });

            this.getWorld().composites.forEach(composite => {
                if (composite.pawn)
                    composite.pawn.tick(tickEvent);
            });

            this.gym.goals.forEach(g => {
                g.tick(tickEvent);
            });

            if (this.timestamp - this.lastGameChangedAt > this.attentionSpan) {
                if (this.rounds >= this.totalRounds)
                    this.endGame();
                else
                    this.chooseAGame();
            }
        }

        private onCollisionActive(collisionEvent: any): void {
            collisionEvent.pairs.filter(pair => pair.bodyA.pawn && pair.bodyB.pawn)
                .forEach(pair => {
                    pair.bodyA.pawn.handleCollision(pair.bodyB.pawn);
                    pair.bodyB.pawn.handleCollision(pair.bodyA.pawn);
                });
        }

        private afterRender(): void {
            var context: any = this.engine.render.canvas.getContext("2d");
            for (var playerCounter: number = 0; playerCounter < this.players.length; playerCounter++) {
                var player = this.players[playerCounter];
                if (player && player.gamepad.setupComplete()) {
                    var textColor = player.team ? "darkred" : "blue";

                    context.font = "24px sans-serif";
                    context.fillStyle = textColor;
                    context.fillText(playerCounter, player.body.position.x, player.body.position.y);
                    context.textAlign = "center";
                    context.textBaseline = "middle";

                    if (player.equipment && player.equipment instanceof Entities.Flag) {
                        context.strokeStyle = "lime";
                        context.lineWidth = 4;
                        context.beginPath();
                        context.arc(player.body.position.x, player.body.position.y, 24, 0, 2 * Math.PI, false);
                        context.stroke();
                    }
                }
            }
        }

        private chooseAGame(): void {
            if (this.rounds < this.totalRounds - 1) {
                var i = Math.floor(Math.random() * this.gameTypes.length);
                this.gameType = this.gameTypes[i];
            } else
                this.gameType = 'Bonus';

            this.lastGameChangedAt = this.timestamp;
            document.getElementById('gametypeDisplay').innerHTML = (this.rounds + 1) + " - " + this.gameType;

            if (this.players.length > 1 && this.gamepadListener && !this.gamepadListener.setupPlayer) {
                this.playSound('whistle');

                var soundName = this.gameType.replace(/ /g, '').toLowerCase();
                setTimeout(this.playSound(soundName), 1000);

                this.rounds++;
            }
        }

        private updateScoreboard(): void {
            var str = "Blue: " + this.scores[0].Total.toFixed(2) + ", Red: " + this.scores[1].Total.toFixed(2);
            document.getElementById('scoreboard').innerHTML = str;
        }

        private endGame(): void {
            var self = this;
            this.playSound("gameover");

            var results: string[] = [];

            for (var teamCounter: number = 1; teamCounter > 0; teamCounter--) {
                var teamResults: string = (teamCounter ? "Red" : "Blue") + " Team";

                for (var gameType in self.scores[teamCounter]) {
                    if (gameType != "Total") {
                        teamResults += "\n" + gameType + ": " + self.scores[teamCounter][gameType];
                    }
                }

                teamResults += "\n Total: " + self.scores[teamCounter].Total;
                results.push(teamResults);
            }

            results.push("Game Over!");
            alert(results.join("\n"));

            this.reset();
        }
    }
}