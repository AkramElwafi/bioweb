import './App.css';
import { useState } from 'react';
import * as XLSX from 'xlsx';

function App() {
  const [excelFile, setExcelFile] = useState(null);
  const [typeError, setTypeError] = useState(null);
  const [excelData, setExcelData] = useState(null);
  const [biomassName, setBiomassName] = useState('');
  const [biomassId, setBiomassId] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [formula, setFormula] = useState('');
  const [combustionEquation, setCombustionEquation] = useState('');
  const [P, setP] = useState('');
  const [r, setR] = useState('');
  const [PC, setPC] = useState(null); // Initially null
  const [debitMassique, setDebitMassique] = useState('');
  const [debitCO2, setDebitCO2] = useState('');
  const [debitH2O, setDebitH2O] = useState('');
  const [debitTotal, setDebitTotal] = useState('');
  const [ratios, setRatios] = useState({ C: 0, H: 0, O: 0 });

  const handleFile = (e) => {
    setTypeError(null);
    let selectedFile = e.target.files[0];
    if (selectedFile) {
      let reader = new FileReader();
      reader.readAsArrayBuffer(selectedFile);
      reader.onload = (e) => {
        setExcelFile(e.target.result);
      };
    }
  };

  const handleFileSubmit = (e) => {
    e.preventDefault();
    if (excelFile !== null) {
      const workbook = XLSX.read(excelFile, { type: 'buffer' });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      setExcelData(data);
    }
  };

  const handleBiomassNameChange = (e) => {
    setBiomassName(e.target.value);
  };

  const handleBiomassIdChange = (e) => {
    setBiomassId(e.target.value);
  };

  const handleExtractData = () => {
    if (!biomassName || !excelData) return;

    const filteredData = excelData.filter(
      (row) => row['biomass_name'].toLowerCase() === biomassName.toLowerCase().trim()
    );

    setFilteredData(filteredData);
    extractCalorificValue(filteredData);
  };

  const handleExtractDataId = () => {
    if (!biomassId || !excelData) return;

    const filteredData = excelData.filter(
      (row) => row['biomass_id'] == biomassId.trim()
    );

    setFilteredData(filteredData);
    extractCalorificValue(filteredData);
  };

  const extractCalorificValue = (data) => {
    const lhvRow = data.find(row => row.property === "Net calorific value (LHV)");
    if (lhvRow) {
      setPC(lhvRow.ar_value);
    }
  };

  const calculateEmpiricalFormula = () => {
    if (!filteredData.length) return;

    const elementData = {};
    filteredData.forEach((row) => {
      if (['Carbon', 'Hydrogen', 'Oxygen'].includes(row.property)) {
        elementData[row.property] = parseFloat(row.ar_value);
      }
    });

    if (!elementData.Carbon || !elementData.Hydrogen || !elementData.Oxygen) return;

    // Convert weights to moles
    const molesCarbon = elementData.Carbon / 12.01;
    const molesHydrogen = elementData.Hydrogen / 1.01;
    const molesOxygen = elementData.Oxygen / 16.00;

    // Find the smallest number of moles
    const minMoles = Math.min(molesCarbon, molesHydrogen, molesOxygen);

    // Divide each by the smallest number of moles to get the simplest ratio
    const ratioCarbon = (molesCarbon / minMoles).toFixed(2);
    const ratioHydrogen = (molesHydrogen / minMoles).toFixed(2);
    const ratioOxygen = (molesOxygen / minMoles).toFixed(2);

    setFormula(`C${ratioCarbon}H${ratioHydrogen}O${ratioOxygen}`);
    setRatios({ C: ratioCarbon, H: ratioHydrogen, O: ratioOxygen });
    calculateCombustionEquation(ratioCarbon, ratioHydrogen, ratioOxygen);
  };

  const calculateCombustionEquation = (C, H, O) => {
    // Convert to numbers
    C = parseFloat(C);
    H = parseFloat(H);
    O = parseFloat(O);

    // Coefficients for the combustion equation
    const e = C;
    const f = (H / 2).toFixed(2);
    const d = ((C + (H / 4) - (O / 2)).toFixed(2));

    setCombustionEquation(`C${C}H${H}O${O} + ${d}O2 -> ${e}CO2 + ${f}H2O`);
  };

  const formatFormula = (formula) => {
    return formula.replace(/([A-Z][a-z]*)(\d+(\.\d+)?)/g, '$1<sub>$2</sub>');
  };

  const handlePChange = (e) => {
    setP(e.target.value);
  };

  const handleRChange = (e) => {
    setR(e.target.value);
  };

  const calculateDebitMassique = () => {
    const pValue = parseFloat(P);
    const rValue = parseFloat(r);
    const pcValue = parseFloat(PC);

    if (!pValue || !rValue || !pcValue) return;

    const debitMassiqueValue = pValue / (rValue * pcValue);
    setDebitMassique(debitMassiqueValue.toFixed(2));

    // Calculate moles and mass flow rates for CO2 and H2O
    const molecularWeights = {
      CO2: 44.01,
      H2O: 18.02
    };

    const molesCO2 = ratios.C * debitMassiqueValue / molecularWeights.CO2;
    const molesH2O = (ratios.H / 2) * debitMassiqueValue / molecularWeights.H2O;

    const debitCO2Value = molesCO2 * molecularWeights.CO2;
    const debitH2OValue = molesH2O * molecularWeights.H2O;
    const debitTotalValue = debitCO2Value + debitH2OValue;

    setDebitCO2(debitCO2Value.toFixed(2));
    setDebitH2O(debitH2OValue.toFixed(2));
    setDebitTotal(debitTotalValue.toFixed(2));
  };

  return (
    <div className="App">
      <h3>Biomass data</h3>
      {/* Form */}
      <form className="form-group custom-form" onSubmit={handleFileSubmit}>
        <input
          type="file"
          className="form-control"
          required
          onChange={handleFile}
        />
        <button type="submit" className="btn btn-success btn-md">
          Upload
        </button>
        {typeError && (
          <div className="alert alert-danger" role="alert">
            {typeError}
          </div>
        )}
      </form>

      {/* Biomass name input */}
      <input
        type="text"
        placeholder="Enter biomass name"
        value={biomassName}
        onChange={handleBiomassNameChange}
      />
      <button className="btn btn-primary" onClick={handleExtractData}>
        Extract Data by Name
      </button>

      <input
        type="text"
        placeholder="Enter biomass id"
        value={biomassId}
        onChange={handleBiomassIdChange}
      />
      <button className="btn btn-primary" onClick={handleExtractDataId}>
        Extract Data by ID
      </button>

      {/* Filtered data display */}
      <div className="filtered-data">
        {filteredData.length > 0 && (
          <div className="table-responsive">
            <h4>Filtered Data</h4>
            <table>
              <thead>
                <tr>
                  {Object.keys(filteredData[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value, index) => (
                      <td key={index}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn btn-secondary" onClick={calculateEmpiricalFormula}>
              Calculer la formule théorique de biomasse
            </button>
          </div>
        )}
      </div>

      {/* Display formula and combustion equation */}
      {formula && (
        <div className="formula-display">
          <h4>Calculated Empirical Formula</h4>
          <p dangerouslySetInnerHTML={{ __html: formatFormula(formula) }}></p>
          <h4>Combustion Equation</h4>
          <p dangerouslySetInnerHTML={{ __html: formatFormula(combustionEquation) }}></p>

          {/* Inputs for debit massique calculation */}
          <div className="debit-massique">
            <h4>Calculate Debit Massique</h4>
            <label>Puissance en MW: </label>
            <input
              type="number"
              placeholder="Enter P (energy)"
              value={P}
              onChange={handlePChange}
            />
            <label>Rendement: </label>
            <input
              type="number"
              placeholder="Enter r (efficiency)"
              value={r}
              onChange={handleRChange}
            />
            <div>
              <p>PC: {PC ? `${PC} MJ/kg` : 'Loading...'}</p>
            </div>
            <button className="btn btn-secondary" onClick={calculateDebitMassique}>
              Calculate Debit Massique
            </button>
            {debitMassique && (
              <div>
                <h4>Debit Massique de biomasse (Entrée): {debitMassique} kg/s</h4>
                <h4>Debit Massique CO2: {debitCO2} kg/s</h4>
                <h4>Debit Massique H2O: {debitH2O} kg/s</h4>
                <h4>Debit Massique Total (Sortie): {debitTotal} kg/s</h4>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Original Excel data display */}
      <div className="viewer">
        {excelData ? (
          <div className="table-responsive">
            <h4>Original Excel Data</h4>
            <table>
              <thead>
                <tr>
                  {Object.keys(excelData[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {excelData.map((individualExcelData, index) => (
                  <tr key={index}>
                    {Object.keys(individualExcelData).map((key) => (
                      <td key={key}>{individualExcelData[key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>No file uploaded</div>
        )}
      </div>
    </div>
  );
}

export default App;