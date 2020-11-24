 /**
 * Inter process communication with PLC applications on ctrlX.
 */
//% icon="\ue268" block="plcipc"
namespace plcipc {
    const EVENT_PREFIX = 'plcipc';

    export class PlcIpcService {
        private apps: PLCApplication[] = [];

        constructor() {
            control.runInBackground(() => {
                loops.forever(() => {
                    for (let i = 0; i < this.apps.length; i++) {
                        for (let j = 0; j < this.apps[i].symbols.length; j++) {
                            const current = this.apps[i].read(this.apps[i].symbols[j].id);
                            if (current !== this.apps[i].symbols[j].current) {
                                this.apps[i].symbols[j].current = current;
                                events.emit(EVENT_PREFIX + this.apps[i].address + this.apps[i].symbols[j].id, 0, current);
                            }
                        }
                    }
                    loops.pause(10);
                });
            });
        }

        initialize(app: PLCApplication): void {
            for (let j = 0; j < app.symbols.length; j++) {
                app.symbols[j].current = app.read(app.symbols[j].id);
            }
            this.apps.push(app);
        }
    }

    const plcIpcService = new PlcIpcService();

    export class PLCSymbol {
        public id: string;
        public vtype: string;
        public current?: any;
    }

    //% fixedInstances
    export class PLCApplication {
        public address: string;
        public symbols: PLCSymbol[] = [];

        constructor(address: string, symbols: PLCSymbol[]) {
            this.address = address;
            this.symbols = symbols;
            plcIpcService.initialize(this);
        }

        /**
         * Read a symbol variable from PLC application.
         * @param symbol reference to read value from
         */
        //% block="from %this read $symbol"
        //% this.fieldEditor="configInstance"
        //% this.fieldOptions.property="apps"
        //% shim=.read
        public read(symbol: string): any {
            return DatalayerLib.read("/plc/app/" + this.address + "/sym/" + symbol);
        }

        /**
         * Write value to a symbol variable in PLC application.
         * @param symbol reference to write value to
         * @param value the new value to write
         */
        //% block="in %this write $value to $symbol"
        //% this.fieldEditor="configInstance"
        //% this.fieldOptions.property="apps"
        //% shim=.write
        public write(symbol: string, value: any): void {
            DatalayerLib.write("/plc/app/" + this.address + "/sym/" + symbol, value);
        }

        /**
         * Register code to run when a PLC symbol variable has changed. 
         */
        //% block="%this on symbol variable $symbol has changed to $value"
        //% this.fieldEditor="configInstance"
        //% this.fieldOptions.property="apps"
        //% draggableParameters="reporter"
        //% shim=.onEvent
        public onEvent(symbol: string, handler: (value: any) => void /*body: Action*/): void {
            events.listen(EVENT_PREFIX + this.address + symbol, 0, handler as any);
        }
    }
}