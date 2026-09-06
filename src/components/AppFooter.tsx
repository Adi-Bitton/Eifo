"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TERMS_TEXT = `בשימוש באפליקציית Eifo? אתה מסכים לתנאים הבאים:

1. המידע על מקומות, מחירים ומבצעים מוגש כמידע כללי בלבד.
2. Eifo? אינה אחראית לשינויים במבצעים, זמינות או תמחור בפועל.
3. השימוש באפליקציה הוא על אחריות המשתמש בלבד.
4. אנו שומרים על הזכות לעדכן או להסיר מקומות ומבצעים ללא התראה.

לשאלות: hi@eifo.app`;

const PRIVACY_TEXT = `Eifo? מכבדת את פרטיותך:

1. אנו אוספים מיקום גיאוגרפי רק אם תבחר לאפשר זאת, ולשימוש מקומי בלבד.
2. איננו מוכרים או משתפים נתונים עם צדדים שלישיים.
3. הנתונים שנשמרים במכשירך הם תחת שליטתך.
4. ניתן לפנות אלינו בכל עת לבקשת מחיקת נתונים: hi@eifo.app`;

export function AppFooter() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<"terms" | "privacy">("terms");

  const openTerms = () => {
    setContent("terms");
    setOpen(true);
  };

  const openPrivacy = () => {
    setContent("privacy");
    setOpen(true);
  };

  const title = content === "terms" ? "תנאי שימוש" : "מדיניות פרטיות";
  const text = content === "terms" ? TERMS_TEXT : PRIVACY_TEXT;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="pointer-events-auto w-full text-center py-1">
        <p className="text-[10px] text-zinc-400 dark:text-zinc-600 leading-none">
          <button
            onClick={openTerms}
            className="hover:underline focus:underline focus:outline-none"
            type="button"
          >
            תנאי שימוש
          </button>
          {" | "}
          <button
            onClick={openPrivacy}
            className="hover:underline focus:underline focus:outline-none"
            type="button"
          >
            מדיניות פרטיות
          </button>
        </p>
      </div>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="max-h-[60vh] overflow-y-auto text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
              {text}
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
