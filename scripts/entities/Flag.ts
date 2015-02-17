﻿module SportsMedley.Entities {
    export class Flag extends Base.Equipment {
        pointsPerSecond: number = 1;
        pickUpCooldown: number = 300;

        lastHeld: number;
        lastPoint: number;

        constructor(game:SportsMedleyGame, x:number, y:number) {
            super(game);

            this.lastHeld = 0;
            this.lastPoint = 0;

            this.body = this.createBody(x, y);
        }

        public tick(tickEvent: any): void {
            this.updateTexture();

            if (this.holder && this.game.gameType == 'Kill The Carrier' || this.game.gameType == 'Bonus') {
                this.lastHeld = tickEvent.timestamp;
                if (tickEvent.timestamp - this.lastPoint > this.pointsPerSecond * 1000) {
                    this.game.score(this.holder.team, 1 / 30);
                    this.lastPoint = tickEvent.timestamp;
                }
            }
        }

        public canEquip(): boolean {
            return (this.game.gameType == 'Kill The Carrier' || this.game.gameType == 'Bonus')
                && (this.game.timestamp - this.lastHeld) > this.pickUpCooldown;
        }

        private createBody(x:number, y:number): any {
            var newBody: any = Matter.Bodies.rectangle(x, y, 24, 24, { frictionAir: 0.05, angle: Math.random() * 2 * Math.PI });
            newBody.pawn = this;
            return newBody;
        }

        private updateTexture(): void {
            if (this.game.gameType == 'Kill The Carrier' || this.game.gameType == 'Bonus')
                this.body.render.sprite.texture = './assets/images/flag-active.png';
            else
                this.body.render.sprite.texture = './assets/images/flag-inactive.png';
        }
    }
}