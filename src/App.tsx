import { DynamicForm } from './components/DynamicForm';
import { sampleForm } from './data/sampleForm';
import { TooltipContainer } from './components/ui/tooltip-container';

function App() {
  const handleFormComplete = (answers: Record<string, any>) => {
    console.log('Form completed with answers:', answers);
    // Here you would typically send the data to your backend
  };

  return (
    <div className="App">
      <DynamicForm 
        config={sampleForm} 
        onComplete={handleFormComplete}
      />
      <TooltipContainer />
    </div>
  );
}

export default App;
