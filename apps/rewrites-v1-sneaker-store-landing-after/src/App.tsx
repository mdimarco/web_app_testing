import Nav from './components/Nav';
import Hero from './components/Hero';
import Problem from './components/Problem';
import Shelf from './components/Shelf';
import HowItWorks from './components/HowItWorks';
import Proof from './components/Proof';
import Close from './components/Close';

export default function App() {
  return (
    <div id="top">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Shelf />
        <HowItWorks />
        <Proof />
        <Close />
      </main>
    </div>
  );
}
