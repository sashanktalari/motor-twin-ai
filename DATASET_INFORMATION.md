# Dataset Information & CWRU Bearing Testbed

## 1. Primary Benchmark: CWRU Bearing Data Center

The empirical foundation of **MOTOR TWIN AI** is derived from the world-standard **Case Western Reserve University (CWRU) Bearing Data Center** benchmark dataset, collected under the supervision of Prof. Kenneth A. Loparo.

### 1.1 Experimental Apparatus Description
The physical testbed consisted of:
- **Drive Motor:** 2 HP Reliance Electric three-phase squirrel-cage induction motor (NEMA Frame 182T).
- **Dynamometer:** Torque transducer and dynamometer coupled to the motor to simulate mechanical load (0 HP, 1 HP, 2 HP, 3 HP).
- **Test Bearings:**
  - Drive-End (DE) Bearing: **SKF 6205-2RS JEM** deep groove ball bearing.
  - Fan-End (FE) Bearing: **SKF 6203-2RS JEM** deep groove ball bearing.
- **Transducers:** High-frequency accelerometers attached magnetically to the motor housing at the 12 o'clock position on the drive-end housing.
- **Sampling Frequency ($F_s$):** Standard 12,000 samples/second (12 kHz) and 48,000 samples/second (48 kHz). The MOTOR TWIN AI platform focuses on the primary 12 kHz drive-end series.

---

## 2. Bearing Kinematics & Theoretical Defect Frequencies

For the primary drive-end bearing (**SKF 6205**), physical dimensions are:
- **Number of Rolling Elements ($n$):** 9 balls
- **Ball Diameter ($d$):** 7.94 mm (0.3126 in)
- **Pitch Diameter ($D$):** 39.04 mm (1.537 in)
- **Contact Angle ($\alpha$):** $0^\circ$

At rated synchronous/load speed of **1797 RPM** (shaft frequency $f_r = 1797 / 60 = 29.95\text{ Hz}$):

### Kinematic Equations & Calculated Frequencies:

1. **Ball Pass Frequency Outer Race (BPFO):**
   $$f_{\text{BPFO}} = \frac{n}{2} f_r \left(1 - \frac{d}{D} \cos \alpha\right) = \frac{9}{2} (29.95) \left(1 - \frac{7.94}{39.04}\right) \approx 107.36\text{ Hz}$$

2. **Ball Pass Frequency Inner Race (BPFI):**
   $$f_{\text{BPFI}} = \frac{n}{2} f_r \left(1 + \frac{d}{D} \cos \alpha\right) = \frac{9}{2} (29.95) \left(1 + \frac{7.94}{39.04}\right) \approx 162.19\text{ Hz}$$

3. **Ball Spin Frequency (BSF):**
   $$f_{\text{BSF}} = \frac{D}{2d} f_r \left[1 - \left(\frac{d}{D} \cos \alpha\right)^2\right] = \frac{39.04}{2(7.94)} (29.95) \left[1 - \left(\frac{7.94}{39.04}\right)^2\right] \approx 70.47\text{ Hz}$$

4. **Fundamental Train Frequency (FTF / Cage):**
   $$f_{\text{FTF}} = \frac{f_r}{2} \left(1 - \frac{d}{D} \cos \alpha\right) = \frac{29.95}{2} \left(1 - \frac{7.94}{39.04}\right) \approx 11.93\text{ Hz}$$

---

## 3. Seeded Fault Categories & File Mappings

In the CWRU experiments, single-point faults were introduced into test bearings using Electro-Discharge Machining (EDM) with fault diameters of 0.007 inches (7 mils), 0.014 inches (14 mils), and 0.021 inches (21 mils).

The four core benchmark recordings used by MOTOR TWIN AI are:

| File Name | CWRU Designation | Defect Location | Fault Depth | Motor Load | Operating Speed |
|---|---|---|---|---|---|
| `CWRU_97_Normal_0HP.mat` | 97 (Normal) | Baseline Healthy | None | 0 HP | 1797 RPM |
| `CWRU_105_InnerRace_0.007_0HP.mat` | 105 (Drive End) | Inner Race Fault | 0.007 in | 0 HP | 1797 RPM |
| `CWRU_118_Ball_0.007_0HP.mat` | 118 (Drive End) | Ball Element Fault | 0.007 in | 0 HP | 1797 RPM |
| `CWRU_130_OuterRace_0.007_0HP.mat` | 130 (Drive End) | Outer Race (Centered @ 6:00) | 0.007 in | 0 HP | 1797 RPM |

---

## 4. Signal Segmentation & Format Support

### Windowing Parameters
- **Window Length:** 2048 discrete acceleration samples ($\approx 170.67\text{ ms}$ at 12 kHz, capturing over 5 complete motor revolutions).
- **Training Stride:** 512 samples.
- **Testing Stride:** 1024 samples (non-overlapping with training sequence).

### Custom File Upload Compatibility
The platform ingestion engine supports:
- **MATLAB `.mat` files:** Scans internal dictionary structures for accelerometer arrays (`*DE_time`, `*FE_time`, `X*`, or numeric 1D vectors).
- **Comma-Separated Values (`.csv`):** Single column of numeric vibration acceleration values or two columns with timestamp.
