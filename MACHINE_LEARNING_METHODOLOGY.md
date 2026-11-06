# Machine Learning Methodology — MOTOR TWIN AI

## 1. Feature Engineering: 17 Multi-Domain Descriptors

Raw vibration signals cannot be fed directly into standard tabular classifiers due to dimensionality, phase shift variability, and high computational cost. **MOTOR TWIN AI** implements an invariant feature extraction pipeline that computes **17 statistical moments and spectral metrics** for each signal window ($x[n]$, length $N = 2048$, sampling rate $F_s = 12000\text{ Hz}$).

### 1.1 Time-Domain Statistical Moments (11 Features)

1. **Mean ($\mu$):**
   $$\mu = \frac{1}{N} \sum_{n=1}^N x[n]$$
2. **Standard Deviation ($\sigma$):**
   $$\sigma = \sqrt{\frac{1}{N-1} \sum_{n=1}^N (x[n] - \mu)^2}$$
3. **Variance ($\sigma^2$):**
   $$\sigma^2 = \frac{1}{N-1} \sum_{n=1}^N (x[n] - \mu)^2$$
4. **Root Mean Square ($x_{\text{rms}}$):**
   $$x_{\text{rms}} = \sqrt{\frac{1}{N} \sum_{n=1}^N x[n]^2}$$
5. **Peak-to-Peak Amplitude ($x_{\text{ptp}}$):**
   $$x_{\text{ptp}} = \max(x[n]) - \min(x[n])$$
6. **Skewness ($S$):** Measures asymmetry of the probability distribution.
   $$S = \frac{\frac{1}{N} \sum_{n=1}^N (x[n] - \mu)^3}{\sigma^3}$$
7. **Kurtosis ($K$):** Sensitive indicator of transient impact spikes from bearing pitting.
   $$K = \frac{\frac{1}{N} \sum_{n=1}^N (x[n] - \mu)^4}{\sigma^4}$$
8. **Peak Absolute Amplitude ($x_{\text{peak}}$):**
   $$x_{\text{peak}} = \max(|x[n]|)$$
9. **Crest Factor ($CF$):** Ratio of peak impact to effective RMS level.
   $$CF = \frac{x_{\text{peak}}}{x_{\text{rms}}}$$
10. **Shape Factor ($SF$):**
    $$SF = \frac{x_{\text{rms}}}{\frac{1}{N} \sum_{n=1}^N |x[n]|}$$
11. **Impulse Factor ($IF$):**
    $$IF = \frac{x_{\text{peak}}}{\frac{1}{N} \sum_{n=1}^N |x[n]|}$$

---

### 1.2 Frequency-Domain Spectral Descriptors (6 Features)

After removing DC bias ($x_c[n] = x[n] - \mu$), the single-sided discrete Fast Fourier Transform (FFT) magnitude spectrum is computed:
$$X_k = \frac{2}{N} \left|\sum_{n=0}^{N-1} x_c[n] e^{-j 2\pi k n / N}\right| \quad \text{for } k = 0, \dots, \frac{N}{2}$$

The spectral normalized probability distribution is defined as:
$$P_k = \frac{X_k}{\sum_{i=0}^{N/2} X_i}$$

12. **Dominant Frequency ($f_{\text{max}}$):** Frequency component possessing maximal spectral power.
13. **Spectral Centroid ($f_c$):** Center of gravity of the power spectrum.
    $$f_c = \sum_{k=0}^{N/2} f_k P_k$$
14. **Spectral Energy ($E_s$):**
    $$E_s = \sum_{k=0}^{N/2} X_k^2$$
15. **Spectral Standard Deviation ($\sigma_s$):** Spectral bandwidth spread.
    $$\sigma_s = \sqrt{\sum_{k=0}^{N/2} (f_k - f_c)^2 P_k}$$
16. **Spectral Skewness ($S_s$):** Spectral tilt toward high or low frequencies.
    $$S_s = \frac{\sum_{k=0}^{N/2} (f_k - f_c)^3 P_k}{\sigma_s^3}$$
17. **Spectral Kurtosis ($K_s$):** Measure of non-Gaussianity and impulsiveness in frequency bands.
    $$K_s = \frac{\sum_{k=0}^{N/2} (f_k - f_c)^4 P_k}{\sigma_s^4}$$

---

## 2. Preventing Data Leakage

A pervasive error in vibration ML literature is segmenting raw recordings into overlapping windows and randomly splitting windows with `train_test_split()`. Because consecutive overlapping windows share 50% to 75% identical physical samples, random partitioning causes massive data leakage and yields artificially inflated test scores that fail in production.

**MOTOR TWIN AI enforces strict chronological partitioning:**
1. Each continuous recording is sliced along its raw time series:
   - **Training Set:** First 75% of continuous time ($t = 0$ to $0.75 T$).
   - **Testing Set:** Final 25% of continuous time ($t = 0.75 T$ to $T$).
2. Window segmentation is applied separately within each partition.
3. Feature normalization (`StandardScaler`) is fitted strictly on the training partition and applied to the test partition without re-fitting.

---

## 3. Evaluated Classifiers

### 3.1 Random Forest (100 Estimators)
- Ensemble of 100 decorrelated decision trees with max depth 12.
- Handles non-linear feature interactions and provides intrinsic feature importance ranking.

### 3.2 Support Vector Machine (RBF Kernel)
- Radial Basis Function kernel ($C = 10.0, \gamma = \text{scale}$).
- Maximizes the geometric margin between classes in high-dimensional Hilbert space.

### 3.3 K-Nearest Neighbors (k=5, Distance-Weighted)
- Non-parametric metric learner using Minkowski distance with inverse-distance weighting.

### 3.4 Isolation Forest (Unsupervised Anomaly Detector)
- Trained strictly on normal baseline vibration features ($contam = 0.08$).
- Recursively isolates observations in random trees; short path lengths indicate anomalous operating deviations.

---

## 4. Empirical Evaluation Benchmark

Trained on 336 window segments and evaluated on 52 completely unseen test windows:

| Classifier | Test Accuracy | Macro Precision | Macro Recall | Macro F1 Score | Training Duration |
|---|---|---|---|---|---|
| **Random Forest** | **100.0%** | **1.0000** | **1.0000** | **1.0000** | 0.40 s |
| **SVM (RBF Kernel)** | **100.0%** | **1.0000** | **1.0000** | **1.0000** | 0.03 s |
| **K-Nearest Neighbors**| **100.0%** | **1.0000** | **1.0000** | **1.0000** | 0.003 s |

All three models achieve 100% macro F1 on the unseen test partition due to the distinct spectral and kurtosis separation among normal, inner race, ball, and outer race bearing fault kinematics.
