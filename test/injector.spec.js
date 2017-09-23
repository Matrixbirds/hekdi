'use strict';

const { expect } = require('chai');
const Injector = require('../src/injector');
const Module = require('../src/module');

describe('injector', () => {
  describe('register dependency', () => {
    class Dependency1 {
      constructor() {
        this.name = 'Dependency1';
      }
    }

    class Dependency2 {
      static get $inject() {
        return ['D1'];
      }

      constructor(d1) {
        this.name = 'Dependency2';
        this.d1 = d1;
      }
    }

    it('basic usage', () => {
      const injector = new Injector('MOCK');
      injector.register(
        { name: 'D1', strategy: 'singleton', value: Dependency1 },
        { name: 'D2', strategy: 'singleton', value: Dependency2 }
      );

      const instance = injector.resolve('D2');
      expect(instance).to.be.an.instanceOf(Dependency2);
    });

    describe('strategies test', () => {

      it('is singleton', () => {
        const injector = new Injector('MOCK');
        injector.register(
          { name: 'D1', strategy: 'singleton', value: Dependency1 }
        );

        const ref1 = injector.resolve('D1');
        const ref2 = injector.resolve('D1');
        expect(ref1).to.deep.equal(ref2);
      });

      it('is factory', () => {
        const injector = new Injector('MOCK');
        injector.register(
          { name: 'D1', strategy: 'factory', value: Dependency1 }
        );

        const ref1 = injector.resolve('D1');
        const ref2 = injector.resolve('D1');
        expect(ref1).to.not.equal(ref2);
      });

      it('is value', () => {
        const injector = new Injector('MOCK');
        injector.register(
          { name: 'D1', strategy: 'value', value: '123' }
        );

        const d1 = injector.resolve('D1');
        expect(d1).to.equal('123');
      });

      it('is constant', () => {
        const injector = new Injector('MOCK');
        injector.register(
          { name: 'D1', strategy: 'constant', value: '123' }
        );
        const d1 = injector.resolve('D1');
        expect(d1).to.equal('123');
        expect(() => {
          injector.register(
            { name: 'D1', strategy: 'value', value: '12' }
          );
        }).to.throw(Error);
      });

      it('is alias', () => {
        const injector = new Injector('MOCK');
        injector.register(
          { name: 'D1', strategy: 'singleton', value: Dependency1 },
          { name: 'Alias', strategy: 'alias', value: 'D1' }
        );
        const d1 = injector.resolve('Alias');
        expect(d1).to.to.be.an.instanceOf(Dependency1);
      });

      describe('provider', () => {
        it('register provider', () => {
          const injector = new Injector('MOCK');
          class Y {}
          class X {
            static get $inject() {
              return ['Y'];
            }
            constructor(y) {
              expect(y).to.be.an.instanceOf(Y);
            }
          }
          injector.register(
            { name: 'X', strategy: 'provider', value: () => ({ name: 'X', strategy: 'factory', value: X }) },
            { name: 'TestProvider', strategy: 'provider', value: () => ({ name: 'Y', strategy: 'factory', value: Y }) }
          );
          const x = injector.resolve('X');
          const y = injector.resolve('X');
          expect(x).to.be.an.instanceOf(X);
          expect(x).to.not.equal(y);
          expect(injector.resolve('Y')).to.be.an.instanceOf(Y);
        });
        it('throws an error if provider returns provider', () => {
          const injector = new Injector('MOCK');
          expect(() => {
            injector.register(
              { name: 'X', strategy: 'provider', value: () => ({ strategy: 'provider', value: 'V' }) },
            );
          }).to.throw(Error);
        });
      });

      it('is unknown strategy', () => {
        const injector = new Injector('MOCK');
        expect(() => {
          injector.register(
            { name: 'D1', strategy: 'blablabla', value: Dependency1 }
          );
        }).to.throw(Error);
      });
    });

    describe('self|circular dependency', () => {
      it('not accept self dependency', () => {
        class SelfDependentClass {
          static get $inject() {
            return ['SelfDep'];
          }
        }

        const injector = new Injector('MOCK');
        expect(() => {
          injector.register(
            { name: 'SelfDep', strategy: 'singleton', value: SelfDependentClass }
          );
        }).to.throw(Error);
      });

      it('not accept circular dependency', () => {
        class Dependency1 {
          static get $inject() {
            return ['D2'];
          }
        }

        class Dependency2 {
          static get $inject() {
            return ['D1'];
          }
        }

        const injector = new Injector('MOCK');
        expect(() => {
          injector.register(
            { name: 'D1', strategy: 'singleton', value: Dependency1 },
            { name: 'D2', strategy: 'singleton', value: Dependency2 }
          );
        }).to.throw(Error);
      });
    });

    it('imports dependencies from other modules', () => {
      const module = Module.createModule({
        name: 'AnotherModule',
        declarations: [
          { name: 'dependency', strategy: 'factory',  value: Dependency1 }
        ],
        exports: '*'
      });
      const injector = new Injector('MOCK');
      injector.addImports(module.exports);

      expect(injector.getConfigOf('dependency')).to.be.an('object');
    });
  });
});
