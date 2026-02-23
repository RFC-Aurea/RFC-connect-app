import { ReactNode } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  headerAction?: ReactNode;
  hideHeader?: boolean;
}

export default function MobileLayout({ 
  children, 
  title, 
  showBack, 
  onBack,
  headerAction,
  hideHeader = false
}: MobileLayoutProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-background flex justify-center sm:py-8">
      {/* Mobile container constraint for desktop viewing */}
      <div className="w-full sm:max-w-[400px] bg-card sm:rounded-[2rem] sm:shadow-2xl overflow-hidden relative flex flex-col sm:border border-border h-[100dvh] sm:h-[850px]">
        
        {!hideHeader && (
          <header className="px-6 pt-12 pb-4 flex items-center justify-between sticky top-0 bg-card/80 backdrop-blur-md z-50 border-b border-border/50">
            <div className="flex items-center gap-3">
              {showBack && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="-ml-2 h-10 w-10 rounded-full hover:bg-secondary"
                  onClick={handleBack}
                  data-testid="button-back"
                >
                  <ArrowLeft className="h-5 w-5 text-foreground" />
                </Button>
              )}
              {title && (
                <h1 className="font-display font-semibold text-lg text-foreground">
                  {title}
                </h1>
              )}
            </div>
            {headerAction && (
              <div>{headerAction}</div>
            )}
          </header>
        )}

        <main className="flex-1 overflow-y-auto no-scrollbar relative">
          {children}
        </main>
      </div>
    </div>
  );
}