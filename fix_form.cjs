const fs = require('fs');
const file = 'src/components/RentalForm.tsx';
let content = fs.readFileSync(file, 'utf8');

const searchStr = `                <textarea
                  placeholder="Annotations, damage notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
  );
}
`;

const replacementStr = `                <textarea
                  placeholder="Annotations, damage notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full neo-pressed p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                />
              </div>

              {/* Complete Handover Save Trigger */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={conflictingItems.length > 0 || isSubmitting}
                  className="w-full py-4 neo-btn-primary disabled:opacity-50 flex items-center justify-center gap-3 shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {isPreBooking ? 'Save Pre-Booking' : 'Complete Handover'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Handover Camera condition photos */}
          <div className="neo-flat p-8">
            <div className="mb-4">
              <span className="text-[10px] font-bold text-[var(--color-sky)] uppercase tracking-widest font-mono">
                05. Condition Photos
              </span>
            </div>
            <CameraCapture
              photos={issuePhotos}
              onChange={setIssuePhotos}
              label="Attach Handover Photos"
              maxPhotos={5}
            />
          </div>

        </div>
      </div>
    </form>
  );
}
`;

content = content.replace(searchStr, replacementStr);
fs.writeFileSync(file, content);
