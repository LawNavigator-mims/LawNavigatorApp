"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRef, useState } from "react";

export default function LegalDisclaimer() {
  const [hasReadToBottom, setHasReadToBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const content = contentRef.current;
    if (!content) return;

    const scrollPercentage =
      content.scrollTop / (content.scrollHeight - content.clientHeight);
    if (scrollPercentage >= 0.99 && !hasReadToBottom) {
      setHasReadToBottom(true);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">Learn more</Button>
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-0 p-0 sm:max-h-[min(640px,80vh)] sm:max-w-lg [&>button:last-child]:top-3.5 bg-muted">
        <DialogHeader className="contents space-y-0 text-left">
          <DialogTitle className="border-b border-border px-6 py-4 text-base">
            Terms & Conditions
          </DialogTitle>
          <div
            ref={contentRef}
            onScroll={handleScroll}
            className="overflow-y-auto"
          >
            <DialogDescription asChild>
              <div className="px-6 py-4">
                <div className="space-y-4 [&_strong]:font-semibold [&_strong]:text-foreground">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p>
                        <strong>Acceptance of Terms</strong>
                      </p>
                      <p>
                        By accessing and using Law Navigator, users acknowledge
                        that the information provided is for educational and
                        informational purposes only and does not constitute
                        legal advice. Users who do not agree with this
                        disclaimer should discontinue use of the app
                        immediately.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p>
                        <strong>No Attorney-Client Relationships</strong>
                      </p>
                      <p>
                        Law Navigator does not establish an attorney-client
                        relationship. The app does not provide personalized
                        legal counsel. If you require legal assistance, please
                        consult a qualified attorney.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p>
                        <strong>Information Accuracy and Limitations</strong>
                      </p>
                      <p>
                        While Law Navigator strives to provide accurate and
                        up-to-date legal information, laws vary by jurisdiction
                        and may change over time. The app makes no guarantees
                        about the accuracy, completeness, or applicability of
                        its content to specific legal situations.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p>
                        <strong>Limitation of Liability</strong>
                      </p>
                      <p>
                        Law Navigator provides information “as is” without
                        warranties of any kind. The app and its owners are not
                        liable for any direct, indirect, incidental,
                        consequential, or punitive damages arising from user
                        interactions with the platform or reliance on its
                        content.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p>
                        <strong>User Responsibilities</strong>
                      </p>
                      <ul className="list-disc pl-6">
                        <li>
                          Users should verify legal information with official
                          sources or legal professionals.
                        </li>
                        <li>
                          The app is not a substitute for legal consultation.
                        </li>
                        <li>
                          Users are responsible for their actions based on the
                          information provided.
                        </li>
                        <li>
                          Comply with applicable local and international laws
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-1">
                      <p>
                        <strong>Termination Clause</strong>
                      </p>
                      <p>
                        The website may terminate or suspend user access without
                        prior notice for violations of these terms or for any
                        other reason deemed appropriate by the administration.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p>
                        <strong>Governing Law</strong>
                      </p>
                      <p>
                        These terms are governed by the laws of the jurisdiction
                        where the website is primarily operated, without regard
                        to conflict of law principles.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p>
                        For urgent legal matters, please contact a legal
                        professional or your local legal aid services.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="border-t border-border px-6 py-4 sm:items-center">
          {!hasReadToBottom && (
            <span className="grow text-xs text-muted-foreground max-sm:text-center">
              Read all terms before accepting.
            </span>
          )}
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button type="button" disabled={!hasReadToBottom}>
              I agree
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
